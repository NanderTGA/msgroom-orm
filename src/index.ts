import io from "socket.io-client";
import MsgroomSocket, { RawMessage } from "./types/socket.io";

import { resolve as pathResolve } from "path";
import { fileURLToPath, pathToFileURL } from "url";
import arrayStartsWith from "array-starts-with";

import { EventEmitter } from "node:events";
import TypedEmitter from "typed-emitter";

import ClientEvents, { User } from "./types/events";
import {
    CommandMap, CommandContext, CommandFileExports, CommandWithName,
    Command, WalkFunction, NormalizedCommand, ClientOptions,
} from "./types/types";

import { AuthError, ConnectionError, ImpossibleError, NotConnectedError } from "./errors";
import { normalizeCommand, transformMessage, transformNickChangeInfo, transformSysMessage, transformUser } from "./utils/transforms";
import { walkDirectory, dynamicImport } from "./utils/compilerFighting";
import helpCommand from "./helpCommand";

class Client extends (EventEmitter as unknown as new () => TypedEmitter<ClientEvents>) {
    static default = Client;
    private socket?: MsgroomSocket;
    #name: string;
    server: string;

    printErrors: boolean;
    helpSuffix: string;
    blockSelf: boolean;
    welcomeMessage: string;
    apikey?: string;
    
    prefixes: Set<string | RegExp>;
    mainPrefix: string | RegExp;

    users: Record<string, User> = {};
    #ID?: string;
    #sessionID?: string;
    blockedIDs = new Set<string>();
    blockedSessionIDs = new Set<string>();

    commands: CommandMap = {};
    erroredFiles = new Set<string>();

    /**
     * Creates a new msgroom client.
     * @param name The username to use.
     * @param commandPrefixes List of prefixes to be used for commands. Set this to an empty string to disable the command system.
     * @param options Extra options.
     */
    constructor(
        name: string,
        commandPrefixes: string | RegExp | (string | RegExp)[] = [],
        options: ClientOptions = {},
    ) {
        super();

        this.validateNickname(name);
        this.#name = name;

        const commandPrefixesArray = Array.isArray(commandPrefixes) ? commandPrefixes : [ commandPrefixes ];
        this.mainPrefix = options.mainPrefix ?? commandPrefixesArray[0];
        this.prefixes = new Set(commandPrefixesArray);

        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
        this.server = options.server || "wss://msgroom.windows96.net";
        this.printErrors = options.printErrors ?? false;
        this.helpSuffix = options.helpSuffix ?? "";
        this.apikey = options.apikey;

        this.blockSelf = options.blockSelf ?? true;
        if (!options.welcomeMessage && this.blockSelf) this.welcomeMessage = `Hi there! I'm ${name}. Send ${this.mainPrefix}help for a list of commands.`;
        else this.welcomeMessage = options.welcomeMessage ?? "";

        this.commands.help = helpCommand(this);
    }

    /**
     * Connect to a msgroom server.
     * @returns A promise which resolves when the connection has successfully been established.
     */
    async connect(): Promise<void> {
        return new Promise<void>( (resolve, reject) => {
            let userID: string;

            this.socket = io(this.server);
            this.socket //! don't remove this line, you'd break the types

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
                        send : (...args) => void this.sendMessage(...args),
                        reply: (...args) => void this.sendMessage(`**@${message.author.nickname}**`, ...args),
                    });
                })
                .on("sys-message", rawSysMessage => {
                    const sysMessage = transformSysMessage(rawSysMessage);
                    this.emit("sys-message", sysMessage);
                    //@ts-expect-error Don't worry, it's fine. Think about it, you'll understand.
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
                    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
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
            if (this.printErrors) console.warn("\nA message was too long and cannot be sent, it will be printed below:\n", message);
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

    async getCommand(commandAndArguments: string[]): Promise<[ CommandWithName, string[] ] | undefined> {
        return new Promise( resolve => {
            let done = false;
            function testCommand(command: Command, fullCommand: string[]): boolean {
                if (!arrayStartsWith(
                    commandAndArguments.map( argument => argument.toLowerCase() ),
                    fullCommand.map( argument => argument.toLowerCase() ),
                )) return false;

                const commandArguments = commandAndArguments.slice(fullCommand.length);
                const commandWithName = {
                    ...command,
                    name: fullCommand.join(" "),
                };

                done = true;
                resolve([ commandWithName, commandArguments ]);
                return true;
            }
        
            const walkFunction = (command: NormalizedCommand, fullCommand: string[]): void => {
                if (done) return;
                if (testCommand(command, fullCommand)) return;

                for (const alias of command.aliases) {
                    if (testCommand(command, alias)) return;
                }
            };

            const commands: { command: NormalizedCommand, fullCommand: string[] }[] = [];
            this.walkCommandOrMap(this.commands, (command, fullCommand) => {
                commands.push({ command, fullCommand });
            });

            commands.sort( (a, b) => b.fullCommand.length - a.fullCommand.length);
            commands.forEach( ({ command, fullCommand }) => void walkFunction(command, fullCommand));

            resolve(undefined);
        });
    }

    async runCommand(command: CommandWithName, commandHandlerArguments: string[], context: CommandContext) {
        try {
            const commandResult = await command.handler(context, ...commandHandlerArguments);

            if (!commandResult) return;
            if (typeof commandResult == "string") return void context.send(commandResult);
            return void context.send(...commandResult);

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

        let messageWithoutPrefix: string | undefined;
        for (const prefix of this.prefixes) {
            if (
                ( typeof prefix == "string" && message.startsWith(prefix) ) ||
                ( prefix instanceof RegExp && prefix.test(message) )
            ) {
                messageWithoutPrefix = message.replace(prefix, "");
                break;
            }
        }
        
        if (messageWithoutPrefix == undefined) return;
        const parsedArguments = messageWithoutPrefix.split(" ");

        const commandAndArguments = await this.getCommand(parsedArguments);
        if (!commandAndArguments) return void context.send(`That command doesn't exist. Run ${this.mainPrefix}help for a list of commands.`);

        await this.runCommand(...commandAndArguments, context);
    }

    walkCommandOrMap(
        commandOrMap: Command | CommandMap,
        walkFunction: WalkFunction,
        fullCommand: string[] = [],
    ): void {
        let commandMap: CommandMap;
        if (typeof commandOrMap.handler == "function") {
            const command = normalizeCommand(commandOrMap as Command);
            if (fullCommand.length == 0) throw new Error("Please provide the name of the command!");
            walkFunction(command, fullCommand);
            commandMap = command.subcommands;
        } else commandMap = commandOrMap as CommandMap;

        for (const command in commandMap) {
            this.walkCommandOrMap(
                commandMap[command],
                walkFunction,
                fullCommand.concat(command),
            );
        }
    }

    async addCommandsFromFile(file: string | URL): Promise<void> {
        if (typeof file != "string") file = file.href;
        else if (!file.startsWith("file:") && !file.startsWith("data:")) file = pathToFileURL(file).href;

        let defaultFileExport;
        try {
            const fileExports = await dynamicImport<CommandFileExports>(file);
            defaultFileExport = fileExports.default;
        } catch (error) {
            console.error(`\nAn error occurred while loading ${file}`, error);
            this.erroredFiles.add(file);
            return;
        }

        if (typeof defaultFileExport != "function") defaultFileExport = defaultFileExport?.default;

        if (!defaultFileExport) {
            console.error("\n", new Error(
                `${file} doesn't have a default export. The default export should be a function taking an instance of Client as the only argument and should return (a promise which resolves to) a CommandMapEntry.
If it returns a Command (any object which has a property named "handler" that resolves to a function), it will be registered accordingly to client.commands.
Do note that if you're returning a Command directly from a function, you also need to provide a property called name to provide the name of your command.
If it returns any other object, it will be assumed to be a CommandMap and all of its properties will be assigned to client.commands using Object.assign().`,
            ));
            this.erroredFiles.add(file);
            return;
        }

        let importedCommands;
        try {
            importedCommands = await defaultFileExport(this);
        } catch (error) {
            console.error(`\nAn error occurred while loading ${file}`, error);
            this.erroredFiles.add(file);
            return;
        }

        if (!importedCommands) return;
        if (typeof importedCommands.handler == "function") {
            const command = importedCommands as CommandWithName;

            try {
                if (!command.name) throw new Error("You must provide a name for your command!");
            } catch (error) {
                console.error(`\n${file} has an invalid commandName`, error);
                this.erroredFiles.add(file);
                return;
            }

            this.commands[command.name] = command;
            //@ts-expect-error Yeah that's why I'm deleting it.
            delete this.commands[command.name].name;
            return;
        }

        const commandMap = importedCommands as CommandMap;
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
        else if (!(typeof userIDOrObject == "undefined")) blocked   ||= this.blockedIDs.has("" + userIDOrObject.ID)
                                                                    ||  this.blockedSessionIDs.has("" + userIDOrObject.sessionID);

        if (typeof userSessionID == "string") blocked ||= this.blockedSessionIDs.has(userSessionID);

        return blocked;
    }
}

export = Client;