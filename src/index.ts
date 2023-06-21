import io from "socket.io-client";
import MsgroomSocket from "./types/socket.io";

import { EventEmitter } from "node:events";
import TypedEmitter from "typed-emitter";
import ClientEvents, { User } from "./types/events";

import { AuthError, ConnectionError, NotConnectedError } from "./errors";
import { transformMessage, transformNickChangeInfo, transformSysMessage, transformUser } from "./utils/transforms";
import getUser from "./utils/getUser";
import { CommandHandlerMap, CommandHandler, LogFunction } from "./types/types";

class Client extends (EventEmitter as unknown as new () => TypedEmitter<ClientEvents>) {
    private socket?: MsgroomSocket;
    #name: string;
    #server: string;

    users: User[] = [];
    #userID?: string;
    blockedIDs = new Set<string>();
    blockedSessionIDs = new Set<string>();
    commandPrefixes: string[];

    commands: CommandHandlerMap = {
        help: (reply, ...args) => {
            return [ "**List of available commands:**", Object.keys(this.commands).join(", ") ];
        },
    };
    
    static default = Client;

    /**
     * Creates a new msgroom client.
     * @param name The username to use.
     * @param commandPrefixes List of prefixes to be used for commands. Do note these *will be pasted directly in a regular expression*, so **make sure to escape any special characters!**
     * @param server The server to connect to.
     */
    constructor(name: string, commandPrefixes: string | string[] = [], server = "wss://devel.windows96.net:4096") {
        super();
        this.#name = name;
        this.#server = server;
        this.commandPrefixes = typeof commandPrefixes == "string" ? [ commandPrefixes ] : commandPrefixes;
    }

    /**
     * Connect to a msgroom server. This should be the first function you run after creating a new instance of this class.
     * @param name The username you want to use.
     * @param server A URL to the server you want to connect to.
     * @param apikey You can request one from ctrlz.
     * @returns A promise which resolves when the connection has successfully been established.
     */
    async connect(name: string = this.#name, server = this.#server, apikey?: string): Promise<void> {
        return new Promise( (resolve, reject) => {
            this.validateNickname(name);
            
            this.#name = name;
            this.#server = server;

            let userID: string;

            this.socket = io(this.#server);
            this.socket // no you can't remove this line, that would break the types

            //#region connecting to the server
                .on("connect", () => {
                    if (!this.socket) throw new NotConnectedError();
                    this.socket.emit("auth", {
                        user: name,
                    });
                })
                .on("disconnect", () => {
                    this.emit("disconnected");
                })
                .on("connect_error", () => {
                    throw new ConnectionError();
                })
                .on("auth-complete", authenticatedUserID => {
                    if (!this.socket) throw new NotConnectedError();
                    this.socket.emit("online");
                    userID = authenticatedUserID;
                })
                .on("auth-error", ({ reason }) => {
                    reject(new AuthError(reason));
                })
                .on("online", users => {
                    this.users = users.map(transformUser);
                    this.#userID = userID;
                    resolve();
                })
            //#endregion

            //#region main events
                .on("werror", reason => {
                    this.emit("werror", reason);
                })
                .on("message", rawMessage => {
                    const message = transformMessage(rawMessage, this.users);
                    if (this.isBlocked(message.author)) return;

                    this.emit("message", message);
                    void this.processCommands(message.content);
                })
                .on("sys-message", rawSysMessage => {
                    const sysMessage = transformSysMessage(rawSysMessage);
                    this.emit("sys-message", sysMessage);
                    //@ts-ignore Don't worry, it's fine. Think about it, you'll understand.
                    this.emit(`sys-message-${sysMessage.type}`, sysMessage);
                })
                .on("nick-changed", rawNickChangeInfo => {
                    const nickChangeInfo = transformNickChangeInfo(rawNickChangeInfo, this.users);
                    if (this.isBlocked(nickChangeInfo.user)) return;

                    // does changing nickChangeInfo.user work too?? test this
                    //TODO test using devtools and such

                    console.log(nickChangeInfo.user.nickname, "<-- old nick");
                    nickChangeInfo.user.nickname = nickChangeInfo.newNickname;
                    console.log(nickChangeInfo.user.nickname, "<-- new nick");

                    this.emit("nick-change", nickChangeInfo);
                })
                .on("user-join", rawUser => {
                    const user = transformUser(rawUser);
                    if (this.isBlocked(user)) return;

                    this.users.push(user);
                    this.emit("user-join", user);
                })
                .on("user-leave", userLeaveInfo => {
                    const user = getUser(this.users, userLeaveInfo.session_id);
                    const leftUserIndex = this.users.indexOf(user);
                    if (leftUserIndex == -1) return;
                    
                    if (this.isBlocked(user)) return;

                    this.emit("user-leave", user);
                    this.users.splice(leftUserIndex, 1);
                })
                .on("user-update", userUpdateInfo => {
                    const user = getUser(this.users, userUpdateInfo.user);

                    if (this.isBlocked(user)) return;
                    
                    switch (userUpdateInfo.type) {
                        case "tag-add":
                            if (!userUpdateInfo.tag || !userUpdateInfo.tagLabel) return;
                            if (userUpdateInfo.tag.trim() == "") return;

                            if (user.flags.includes(userUpdateInfo.tag)) user.flags.push(userUpdateInfo.tag);

                            this.emit("tag-add", user, userUpdateInfo.tag, userUpdateInfo.tagLabel);
                    }
                });
            //#endregion
            
            this.socket.emit("auth", {
                user: name,
                apikey,
            });
        });
    }

    validateNickname(name: string) {
        if (name.length > 18) throw new Error("Username is longer than 18 characters.");
        if (name.length < 1) throw new Error("Username should be 1 character or more.");
    }

    disconnect() {
        this.socket?.disconnect();
    }

    get server(): string {
        return this.#server;
    }

    get name(): string {
        return this.#name;
    }

    set name(name: string) {
        if (!this.socket) throw new NotConnectedError();

        this.validateNickname(name);

        this.socket.emit("change-user", name);
    }

    get userID(): string {
        if (!this.#userID) throw new NotConnectedError();
        return this.#userID;
    }

    sendMessage(...messages: string[]): void {
        if (!this.socket) throw new NotConnectedError();

        const message = messages.join(" ");
        if (message.length > 2048) return void this.emit("werror", "message too long");

        this.socket.emit("message", {
            type   : "text",
            content: message,
        });
    }

    /**
     * We currently have no idea what this could be, apart from what the type must be according to the code of the official msgroom client.
     * @param args The arguments to pass to the `admin-action` event.
     */
    adminAction(...args: string[]): void {
        if (!this.socket) throw new NotConnectedError();
        this.socket.emit("admin-action", { args });
    }

    getCommand(command: string, commandArguments: string[]): [ CommandHandler, string[] ] | undefined {
        let currentGottenHandler: CommandHandler | CommandHandlerMap = this.commands;

        while (typeof currentGottenHandler != "undefined") {
            currentGottenHandler = currentGottenHandler[command];
            if (!currentGottenHandler) return;
            if (typeof currentGottenHandler == "function") return [ currentGottenHandler, commandArguments ];

            command = commandArguments[0];
            commandArguments.splice(0, 1);
        }
    }

    async processCommands(message: string, reply: LogFunction = (...args: string[]) => this.sendMessage(...args)) {
        const regex = new RegExp(`^(${this.commandPrefixes.join("|")})`, "i");
        if (!regex.test(message)) return;
        
        const commandArguments = message.replace(regex, "").split(" ");
        
        const command = commandArguments[0];
        commandArguments.splice(0, 1);

        const gottenCommand = this.getCommand(command, commandArguments);
        // We can safely assume there is at least one prefix, because otherwise this method wouldn't be called.
        if (!gottenCommand) return reply(`That command doesn't exist. Run ${this.commandPrefixes[0]}help for a list of commands.`);
        const [ commandHandler, commandHandlerArguments ] = gottenCommand;

        try {
            const commandResult = await commandHandler(reply, ...commandHandlerArguments);

            if (!commandResult) return;
            if (typeof commandResult == "string") return reply(commandResult);
            return reply(...commandResult);
        } catch (error) {
            reply(`An error occured while executing ${command}: *${error as string}*`);
        }
    }

    public isBlocked(userID: string, userSessionID?: string): boolean;
    public isBlocked(userIDOrObject: { ID?: string, sessionID?: string }): boolean;
    public isBlocked(
        userIDOrObject?: string | { ID?: string, sessionID?: string },
        userSessionID?: string,
    ): boolean {
        let blocked = false;

        if (typeof userIDOrObject == "string") blocked ||= this.blockedIDs.has(userIDOrObject);
        else if (!(typeof userIDOrObject == "undefined")) blocked   ||= this.blockedIDs.has(userIDOrObject.ID as string)
                                                                    ||  this.blockedSessionIDs.has(userIDOrObject.sessionID as string);

        if (typeof userSessionID == "string") blocked ||= this.blockedSessionIDs.has(userSessionID);

        return blocked;
    }
}

export = Client;