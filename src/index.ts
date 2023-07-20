import io from "socket.io-client";
import MsgroomSocket, { RawMessage } from "./types/socket.io";

import { resolve as pathResolve } from "path";
import { fileURLToPath, pathToFileURL } from "url";

import { EventEmitter } from "node:events";
import TypedEmitter from "typed-emitter";

import ClientEvents, { User } from "./types/events";
import {
    CommandMap, CommandContext, CommandMapEntry, CommandFileExports, CommandWithName,
    Command, WalkFunction,
} from "./types/types";

import { AuthError, ConnectionError, ImpossibleError, NotConnectedError } from "./errors";
import { normalizeCommand, transformMessage, transformNickChangeInfo, transformSysMessage, transformUser } from "./utils/transforms";
import { walkDirectory, dynamicImport } from "./utils/compilerFighting";
import helpCommand from "./helpCommand";

class Client extends (EventEmitter as unknown as new () => TypedEmitter<ClientEvents>) {
    private socket?: MsgroomSocket;
    #name: string;
    #server: string;

    printErrors: boolean;
    helpSuffix: string;
    blockSelf: boolean;
    welcomeMessage: string;
    apikey?: string;
    
    prefixes: Set<string>;
    mainPrefix: string;

    users: Record<string, User> = {};
    #ID?: string;
    #sessionID?: string;
    blockedIDs = new Set<string>();
    blockedSessionIDs = new Set<string>();

    commands: CommandMap = {};
    
    static default = Client;

    /**
     * Creates a new msgroom client.
     * @param name The username to use.
     * @param commandPrefixes List of prefixes to be used for commands. Do note these *will be pasted directly in a regular expression*, so **make sure to escape any special characters!**
     * @param options Extra options.
     * @param options.server The server to connect to.
     * @param options.printErrors Whether to print errors to the console.
     * @param options.helpSuffix A suffix to add to the output of the help command.
     * @param options.blockSelf Whether the bot should block itself. Will force welcomeMessage to be sent.
     * @param options.welcomeMessage A message to send when the bot joins.
     * @param options.mainPrefix The main prefix to use in commands (for example, the help command will use this to tell the user what prefix they should use). This shouldn't have regex in it. Set this to an empty string to disable the command system.
     * @param options.apikey You can request one from ctrlz.
     */
    constructor(
        name: string,
        commandPrefixes: string | string[] = [],
        options: {
            server?: string,
            printErrors?: boolean,
            helpSuffix?: string,
            blockSelf?: boolean,
            welcomeMessage?: string,
            mainPrefix?: string,
            apikey?: string
        } = {},
    ) {
        super();

        this.validateNickname(name);
        this.#name = name;

        const commandPrefixesArray = typeof commandPrefixes == "string" ? [ commandPrefixes ] : commandPrefixes;
        this.mainPrefix = options.mainPrefix ?? commandPrefixesArray[0];
        this.prefixes = new Set(commandPrefixesArray);

        this.#server = options.server || "wss://msgroom.windows96.net";
        this.printErrors = options.printErrors || false;
        this.helpSuffix = options.helpSuffix || "";
        this.apikey = options.apikey;

        this.blockSelf = options.blockSelf ?? true;
        if (!options.welcomeMessage && this.blockSelf) this.welcomeMessage = `Hi there! I'm ${name}. Send ${this.mainPrefix}help for a list of commands.`;
        else this.welcomeMessage = options.welcomeMessage || "";

        this.commands.help = helpCommand(this);
    }

    /**
     * Connect to a msgroom server.
     * @returns A promise which resolves when the connection has successfully been established.
     */
    async connect(): Promise<void> {
        return new Promise<void>( (resolve, reject) => {
            let userID: string;

            this.socket = io(this.#server);
            this.socket // don't remove this line, you'd break the types

            //#region connecting to the server
                .on("connect", () => {
                    if (!this.socket) throw new ImpossibleError();
                    this.socket.emit("auth", {
                        user  : this.#name,
                        apikey: this.apikey,
                    });
                })
                .on("disconnect", () => {
                    this.emit("disconnected");
                })
                .on("connect_error", () => {
                    throw new ConnectionError();
                })
                .on("auth-complete", authenticatedUserID => {
                    if (!this.socket) throw new ImpossibleError();
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

                    this.#ID = userID;
                    resolve();
                });
            //#endregion
        }).then( () => new Promise<void>( resolve => {
            if (!this.welcomeMessage) resolve();

            const sessionIDHandler = (rawMessage: RawMessage) => {
                const message = transformMessage(rawMessage, this.users);
                if (!(message.content == this.welcomeMessage && message.author.ID == this.ID)) return;

                this.#sessionID = message.author.sessionID;
                this.blockedSessionIDs.add(this.#sessionID);

                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                this.socket!.off("message", sessionIDHandler);
                resolve();
            };

            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            this.socket!.on("message", sessionIDHandler);

            this.sendMessage(this.welcomeMessage);
        })).then( () => {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            this.socket!

            //#region main events
                .on("werror", reason => {
                    this.emit("werror", reason);
                })
                .on("message", rawMessage => {
                    const message = transformMessage(rawMessage, this.users);
                    if (this.isBlocked(message.author)) return;

                    this.emit("message", message);
                    void this.processCommands({
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

    get ID(): string {
        if (!this.#ID) throw new NotConnectedError();
        return this.#ID;
    }

    get sessionID(): string {
        if (!this.#sessionID) throw new NotConnectedError();
        return this.#sessionID;
    }

    sendMessage(...messages: string[]): void {
        if (!this.socket) throw new NotConnectedError();

        const message = messages.join(" ");
        if (message.length > 2048) {
            if (this.printErrors) console.warn("A message was too long and cannot be sent, it will be printed below:\n", message);
            return void this.emit("werror", "message too long");
        }

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

    getCommand(command: string, commandArguments: string[]): [ CommandWithName, string[] ] | undefined {
        let currentGottenCommand: CommandMapEntry | undefined;
        let commandName = command;
        for (const key in this.commands) {
            if (key.toLowerCase() == command.toLowerCase()) {
                commandName = command;
                currentGottenCommand = this.commands[key];
            }
        }

        // eslint-disable-next-line no-constant-condition
        while (true) {
            if (typeof currentGottenCommand == "undefined") {
                // right now there are 2 possibilities:
                // either the command doesn't exist
                // or it does exist but as an alias to another command
                // oh god this is going to be a pain
                //TODO
                console.log("undefined", currentGottenCommand, commandName);

                //Object.values()

                return;
            }


            if (typeof currentGottenCommand.handler == "function") {
                const gottenCommand = currentGottenCommand as Command;
                return [ {
                    name       : commandName,
                    description: gottenCommand.description,
                    aliases    : gottenCommand.aliases,
                    handler    : gottenCommand.handler,
                }, commandArguments ];
            }

            command = commandArguments[0];
            commandArguments.splice(0, 1);
            
            const previousGottenCommand = currentGottenCommand as CommandMap;
            currentGottenCommand = previousGottenCommand[command];
            commandName += "." + command;

            if (!currentGottenCommand) for (const key in previousGottenCommand) {
                if (key.toLowerCase() == command.toLowerCase()) {
                    currentGottenCommand = previousGottenCommand[key];
                }
            }
        }
    }

    async runCommand(command: CommandWithName, commandHandlerArguments: string[], context: CommandContext) {
        try {
            const commandResult = await command.handler(context, ...commandHandlerArguments);

            if (!commandResult) return;
            if (typeof commandResult == "string") return context.send(commandResult);
            return context.send(...commandResult);

        } catch (error) {
            context.send(`An error occurred while executing ${command.name}: *${error as string}*`);

            if (this.printErrors) console.error(`
An error occurred at ${context.message.date.toString()}.
Message: ${context.message.content}
User: ${context.message.author.nickname}
User's ID: ${context.message.author.ID}
User's session ID: ${context.message.author.sessionID}
Full error:
`, error);
        }
    }

    async processCommands(context: CommandContext) {
        if (!this.mainPrefix) return;
        const message = context.message.content;

        const regex = new RegExp(`^(${Array.from(this.prefixes).join(")|(")})`, "i"); // I checked and we should we safe from ReDoS
        if (!regex.test(message)) return;

        const [ commandName, ...commandArguments ] = message.replace(regex, "").split(" ");

        const commandAndArguments = this.getCommand(commandName, commandArguments);
        if (!commandAndArguments) return context.send(`That command doesn't exist. Run ${this.mainPrefix}help for a list of commands.`);

        await this.runCommand(...commandAndArguments, context);
    }

    walkCommandMapEntry(
        commandMapEntry: CommandMapEntry,
        walkFunction: WalkFunction,
        name = "",
        fullCommand: string[] = [],
    ): void {
        this.validateCommandName(name);
        
        // Create a new array because otherwise we're gonna break everything
        fullCommand = Array.from(fullCommand);
        if (name) fullCommand.push(name);

        if (typeof commandMapEntry.handler == "function") {
            const command = commandMapEntry as Command;
            const normalizedCommand = normalizeCommand(command);
            return walkFunction({ command: normalizedCommand }, name, fullCommand);
        }

        const commandMap = commandMapEntry as CommandMap;
        walkFunction({ commandMap }, name, fullCommand);

        for (const commandMapEntry in commandMap) {
            this.walkCommandMapEntry(
                commandMap[commandMapEntry],
                walkFunction,
                commandMapEntry,
                fullCommand,
            );
        }
    }

    validateCommandName(this: void, commandName?: string) {
        if (typeof commandName != "string") throw new TypeError("A commandName must be a string.");
        if (commandName.indexOf(" ") >= 0) throw new Error("You cannot have spaces in a command name, this will cause your command to be unable to be invoked. Use subcommands instead.");
    }

    async addCommandsFromFile(file: string | URL): Promise<void> {
        if (typeof file != "string") file = file.href;
        else if (!file.startsWith("file:") && !file.startsWith("data:")) file = pathToFileURL(file).href;

        let { default: defaultFileExport } = await dynamicImport<CommandFileExports>(file);
        if (typeof defaultFileExport != "function") defaultFileExport = defaultFileExport.default;
        if (!defaultFileExport) throw new Error(
            `${file} doesn't have a default export. The default export should be a function taking an instance of Client as the only argument and should return (a promise which resolves to) a CommandMapEntry.

If it returns a Command (any object which has a property named "handler" that resolves to a function), it will be registered accordingly to client.commands.
Do note that if you're returning a Command directly from a function, you also need to provide a property called name to provide the name of your command.

If it returns an object, it will be assumed to be a CommandMap and all of its properties will be assigned to client.commands using Object.assign().`,
        );

        const importedCommands = await defaultFileExport(this);

        if (typeof importedCommands.handler == "function") {
            const command = importedCommands as CommandWithName;
            if (!command.name) throw new Error("You must provide a name for your command!");
            this.validateCommandName(command.name);

            // We don't need the name property
            this.commands[command.name] = {
                description: command.description,
                aliases    : command.aliases,
                handler    : command.handler,
            };
            return;
        }

        const commandMap = importedCommands as CommandMap;
        Object.keys(commandMap).forEach(this.validateCommandName);
        Object.assign(this.commands, importedCommands);
    }

    async addCommandsFromDirectory(directory?: string | URL): Promise<void> {
        if (!directory) {
            if (!require.main) throw new Error("You cannot leave out the directory argument in this context!");
            directory = pathResolve(require.main.path, "./commands");
        }
        if (typeof directory != "string") directory = fileURLToPath(directory);

        const files = await walkDirectory(directory);
        const modules = files
            .filter( file => file.name.endsWith(".js"))
            .map( file => this.addCommandsFromFile(file.path));

        await Promise.all(modules);
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