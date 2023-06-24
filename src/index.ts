import io from "socket.io-client";
import MsgroomSocket from "./types/socket.io";

import { EventEmitter } from "node:events";
import TypedEmitter from "typed-emitter";
import ClientEvents, { User } from "./types/events";

import { AuthError, ConnectionError, NotConnectedError } from "./errors";
import { transformMessage, transformNickChangeInfo, transformSysMessage, transformUser } from "./utils/transforms";
import { CommandHandlerMap, CommandHandler, LogFunction, CommandContext } from "./types/types";
import { formatWithOptions } from "node:util";

class Client extends (EventEmitter as unknown as new () => TypedEmitter<ClientEvents>) {
    private socket?: MsgroomSocket;
    #name: string;
    #server: string;

    users: Record<string, User> = {};
    #userID?: string;
    blockedIDs = new Set<string>();
    blockedSessionIDs = new Set<string>();
    commandPrefixes: string[];

    commands: CommandHandlerMap = {
        help: (reply, ...args) => {
            let output =  `**The current ${this.commandPrefixes.length > 1 ? "prefixes are" : "prefix is"} \`${this.commandPrefixes.join("`, `")}\`
Here's a list of all available commands. For more information on a command, run \`${this.commandPrefixes[0]}help <command>\`**`;
            
            function iterateOverCommandHandlerMap(commandHandlerMap: CommandHandlerMap | CommandHandler, commandHandlerMapName: string, prefix: string) {
                if (typeof commandHandlerMap == "function") {
                    if (commandHandlerMapName != "undefined") output += "\n" + prefix;
                    return;
                }

                if (commandHandlerMapName) output += "\n" + prefix;
                
                Object.keys(commandHandlerMap)
                    .forEach( key => iterateOverCommandHandlerMap(commandHandlerMap[key], key, `${prefix}${key} `) );
            }

            iterateOverCommandHandlerMap(this.commands, "", this.commandPrefixes[0]);

            return output.trim();
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
                    users
                        .map(transformUser)
                        .forEach( user => this.users[user.sessionID] = user);

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
                    void this.processCommands(message.content, {
                        message,
                        send : (...args) => this.sendMessage(...args),
                        reply: (...args) => this.sendMessage(`@${message.author.nickname}`, ...args),
                    });
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

                    nickChangeInfo.user.nickname = nickChangeInfo.newNickname;

                    this.emit("nick-change", nickChangeInfo);
                })
                .on("user-join", rawUser => {
                    const user = transformUser(rawUser);
                    if (this.isBlocked(user)) return;

                    this.users[user.sessionID] = user;
                    this.emit("user-join", user);
                })
                .on("user-leave", userLeaveInfo => {
                    const user = this.users[userLeaveInfo.session_id];
                    if (this.isBlocked(user)) return;

                    this.emit("user-leave", user);
                    delete this.users[userLeaveInfo.session_id];
                })
                .on("user-update", userUpdateInfo => {
                    const user = this.users[userUpdateInfo.user];

                    if (this.isBlocked(user)) return;
                    
                    switch (userUpdateInfo.type) {
                        case "tag-add":
                            if (!userUpdateInfo.tag?.trim() || !userUpdateInfo.tagLabel) return;

                            if (!user.flags.includes(userUpdateInfo.tag)) user.flags.push(userUpdateInfo.tag);

                            this.emit("tag-add", {
                                user,
                                newTag     : userUpdateInfo.tag,
                                newTagLabel: userUpdateInfo.tagLabel,
                            });
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
     * Only msgroom staff know the list of commands.
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

    async runCommand(commandName: string, commandHandler: CommandHandler, commandHandlerArguments: string[], context: CommandContext) {
        try {
            const commandResult = await commandHandler(context, ...commandHandlerArguments);

            if (!commandResult) return;
            if (typeof commandResult == "string") return context.send(commandResult);
            return context.send(...commandResult);
        } catch (error) {
            const formattedError = formatWithOptions({ compact: true, colors: false }, error);
            context.send(`An error occured while executing ${commandName}: *${formattedError}*`);
        }
    }

    async processCommands(message: string, context: CommandContext) {
        const regex = new RegExp(`^(${this.commandPrefixes.join("|")})`, "i");
        if (!regex.test(message)) return;
        
        const commandArguments = message.replace(regex, "").split(" ");
        
        const commandName = commandArguments[0];
        commandArguments.splice(0, 1);

        const gottenCommand = this.getCommand(commandName, commandArguments);
        // We can safely assume there is at least one prefix, because otherwise this method wouldn't be called.
        if (!gottenCommand) return context.send(`That command doesn't exist. Run ${this.commandPrefixes[0]}help for a list of commands.`);

        const [ commandHandler, commandHandlerArguments ] = gottenCommand;
        await this.runCommand(commandName, commandHandler, commandHandlerArguments, context);
    }

    validateCommandName(this: void, commandName?: string) {
        if (typeof commandName != "string") throw new TypeError("A commandName must be a string.");
        if (commandName.indexOf(" ") >= 0) throw new Error("You cannot have spaces in a command name, this will cause your command to be unable to be invoked. Use subcommands instead.");
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