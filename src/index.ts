import io from "socket.io-client";
import MsgroomSocket from "./socket.io";
import { decode as decodeHTML } from "he";

import { EventEmitter } from "node:events";
import TypedEmitter from "typed-emitter";
import ClientEvents, { User } from "./events";

import { AuthError, ConnectionError, NotConnectedError } from "./errors";
import { transformUser } from "./transforms";

type LogFunction = (...args: string[]) => void;
type CommandHandler = (reply: LogFunction, ...args: string[]) => (Promise<string | string[] | void> | string | string[] | void);
type CommandHandlerMap = {
    [key: string]: CommandHandler | CommandHandlerMap
};

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
            if (name.length > 18) throw new Error("Username is longer than 18 characters.");
            if (name.length < 1) throw new Error("Username should be 1 character or more.");
            
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
                .on("message", message => {
                    if (this.isBlocked(message)) return;
                    message.content = decodeHTML(message.content);

                    this.emit("message", message);
                    void this.processCommands(message.content);
                })
                .on("sys-message", sysMessage => {
                    this.emit("sys-message", sysMessage);
                    //@ts-ignore don't worry, it's fine. Typescript is just being dumb.
                    this.emit(`sys-message-${sysMessage.type}`, sysMessage);
                })
                .on("nick-changed", nickChangeInfo => {
                    if (this.isBlocked(nickChangeInfo)) return;

                    const changedUserIndex = this.users.findIndex( user => user.id == nickChangeInfo.id && nickChangeInfo.session_id == user.id && nickChangeInfo.oldUser == user.user );
                    if (changedUserIndex == -1) return;

                    this.users[changedUserIndex].user = nickChangeInfo.newUser;

                    this.emit("nick-change", nickChangeInfo);
                })
                .on("user-join", user => {
                    if (this.isBlocked(user)) return;

                    this.users.push(user);
                    this.emit("user-join", user);
                })
                .on("user-leave", userLeaveInfo => {
                    if (this.isBlocked(userLeaveInfo)) return;

                    const leftUserIndex = this.users.findIndex( user => user.id == userLeaveInfo.id && user.session_id == userLeaveInfo.session_id && user.user == userLeaveInfo.user );
                    if (leftUserIndex == -1) return;

                    this.emit("user-leave", this.users[leftUserIndex]);
                    this.users.splice(leftUserIndex, 1);
                })
                .on("user-update", userUpdateInfo => {
                    const updatedUserIndex = this.users.findIndex( user => user.session_id == userUpdateInfo.user );
                    if (updatedUserIndex == -1) return;

                    if (this.isBlocked(this.users[updatedUserIndex])) return;
                    
                    switch (userUpdateInfo.type) {
                        case "tag-add":
                            if (!userUpdateInfo.tag || !userUpdateInfo.tagLabel) return;
                            if (userUpdateInfo.tag.trim() == "") return;

                            if (this.users[updatedUserIndex].flags.includes(userUpdateInfo.tag)) this.users[updatedUserIndex].flags.push(userUpdateInfo.tag);

                            this.emit("tag-add", this.users[updatedUserIndex], userUpdateInfo.tag, userUpdateInfo.tagLabel);
                    }
                });
            //#endregion
            
            this.socket.emit("auth", {
                user: name,
                apikey,
            });
        });
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

        if (name.length > 18) throw new Error("Username is longer than 18 characters.");
        if (name.length < 1) throw new Error("Username should be 1 character or more.");

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
    public isBlocked(userIDOrObject: { id?: string, sessionID?: string, session_id?: string }): boolean;
    public isBlocked(
        userIDOrObject?: string | { id?: string, sessionID?: string, session_id?: string },
        userSessionID?: string,
    ): boolean {
        let blocked = false;

        if (typeof userIDOrObject == "string") blocked ||= this.blockedIDs.has(userIDOrObject);
        else if (!(typeof userIDOrObject == "undefined")) blocked   ||= this.blockedIDs.has(userIDOrObject.id as string)
                                                                    ||  this.blockedSessionIDs.has(userIDOrObject.sessionID as string)
                                                                    ||  this.blockedSessionIDs.has(userIDOrObject.session_id as string);

        if (typeof userSessionID == "string") blocked ||= this.blockedSessionIDs.has(userSessionID);

        return blocked;
    }
}

export = Client;