import io from "socket.io-client";
import type MsgroomSocket from "#types/socket.io.js";

import { fileURLToPath, pathToFileURL } from "url";
import arrayStartsWith from "array-starts-with";

import { EventEmitter } from "node:events";
import type TypedEmitter from "typed-emitter";

import type { default as ClientEvents, User } from "#types/events.js";
import type {
    CommandMap, CommandContext, CommandFileExports, CommandWithName,
    Command, WalkFunction, NormalizedCommand, ClientOptions,
} from "#types";

import { AuthError, ConnectionError, NotConnectedError } from "./errors.js";
import { normalizeCommand, transformMessage, transformNickChangeInfo, transformSysMessage, transformUser } from "#utils/transforms.js";
import { walkDirectory, dynamicImport } from "#utils/compilerFighting.js";
import helpCommand from "./helpCommand.js";

export default class Client extends (EventEmitter as unknown as new () => TypedEmitter.default<ClientEvents>) {
    private socket?: MsgroomSocket;
    #name: string;
    server: string;

    printErrors: boolean;
    helpSuffix: string;
    blockSelf: boolean;
    welcomeMessage: string;
    apikey?: string;
    unescapeMessages: boolean;
    
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
        this.unescapeMessages = options.unescapeMessages ?? true;

        this.blockSelf = options.blockSelf ?? true;
        if (!options.welcomeMessage && this.blockSelf) this.welcomeMessage = `Hi there! I'm ${name}. Send ${this.mainPrefix}help for a list of commands.`;
        else this.welcomeMessage = options.welcomeMessage ?? "";

        this.commands.help = helpCommand(this);
    }

    /**
     * Connect to a msgroom server.
     * @returns A promise which resolves when the connection has successfully been established.
     * @throws An {@link AuthError} when the server won't let you in.
     */
    async connect(): Promise<void> {
        return new Promise<void>( (resolve, reject) => {
            let userID: string;

            this.socket = io(this.server);
            this.socket //! don't remove this line, you'd break the types

            //#region connecting to the server
                .on("connect", () => {
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    this.socket!.emit("auth", {
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
                .on("auth-complete", (authenticatedUserID, sessionID) => {
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    this.socket!.emit("online");

                    userID = authenticatedUserID;
                    this.#sessionID = sessionID;

                    if (this.welcomeMessage) this.sendMessage(this.welcomeMessage);
                    if (this.blockSelf) this.blockedSessionIDs.add(this.sessionID);
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
            //#endregion connecting to the server
        }).then( () => {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            this.socket!

            //#region main events
                .on("werror", reason => {
                    this.emit("werror", reason);
                })
                .on("message", rawMessage => {
                    const message = transformMessage(rawMessage, this.users, this.unescapeMessages);
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
            //#endregion main events
        });
    }

    /**
     * Validates a nickname.
     * A nickname should be 1-18 characters.
     * @param name The nickname to validate.
     * @throws An {@link Error} when the criteria has not been met.
     */
    validateNickname(name: string) {
        if (name.length > 18) throw new Error("Username is longer than 18 characters.");
        if (name.length < 1) throw new Error("Username should be 1 character or more.");
    }

    /**
     * Disconnects from the server if connected.
     */
    disconnect() {
        this.socket?.disconnect();
    }

    /**
     * The user's name.
     * You can change it by reassigning this variable.
     * Do note that changing it is done using an asynchronous operation, meaning the change won't be reflected immediately.
     * @throws A {@link NotConnectedError} when you haven't connected yet.
     */
    get name(): string {
        return this.#name;
    }

    set name(name: string) {
        if (!this.socket) throw new NotConnectedError();
        this.validateNickname(name);

        this.socket.emit("change-user", name);
    }

    /**
     * The user's ID.
     * @throws A {@link NotConnectedError} when you haven't connected yet.
     */
    get ID(): string {
        if (!this.#ID) throw new NotConnectedError();
        return this.#ID;
    }

    /**
     * The user's session ID.
     * @throws A {@link NotConnectedError} when you haven't connected yet.
     */
    get sessionID(): string {
        if (!this.#sessionID) throw new NotConnectedError();
        return this.#sessionID;
    }

    /**
     * Sends a message. (The character limit is 2048.)
     * All arguments will be joined together with a space before being sent.
     * Anything that is not a string will be converted to one, but this does not mean that it is a good practice to do so.
     * @param messages The message to send.
     * @throws A {@link NotConnectedError} when you haven't connected yet.
     */
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
     * Triggers an admin action.
     * The way it works is by passing an array of arguments, similar to how commands work.
     * We currently have no idea what these commands could be because only msgroom staff know the list of commands.
     * @param args The arguments to pass to the `admin-action` event.
     * @throws A {@link NotConnectedError} when you haven't connected yet.
     */
    adminAction(...args: string[]): void {
        if (!this.socket) throw new NotConnectedError();
        this.socket.emit("admin-action", { args });
    }

    /**
     * Gets a command from its call.
     * @param commandAndArguments The split arguments which also have the command in it.
     * @returns A promise which resolves to the command and its arguments, or undefined if none was found.
     */
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

    /**
     * Runs a command.
     * @param command The command to run.
     * @param commandHandlerArguments The arguments to pass to the command's handler.
     * @param context The context in which the command was triggered.
     * @returns A promise which resolves when the command has been ran.
     */
    async runCommand(command: CommandWithName, commandHandlerArguments: string[], context: CommandContext): Promise<void> {
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

    /**
     * Processes a message to check for command calls.
     * @param context The context which will be passed to command handlers.
     * @returns A promise which resolves when the associated command (if there is one) has been called.
     */
    async processCommands(context: CommandContext): Promise<void> {
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

    /**
     * Walks a commandMap or a command's subcommands recursively.
     * @param commandOrMap The command or commandMap to walk.
     * @param walkFunction The function that will be called with every command.
     * @param fullCommand The full path to the current command or commandMap being walked. (Used when walking, you probably don't need this).
     * @throws An {@link Error} when fullCommand is empty when commandOrMap is a command.
     */
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

    /**
     * Loads a module.
     * Any errors thrown anywhere in the process will be caught and logged to the console.
     * @param file The module to load.
     * @returns A promise which resolves once the module has been loaded.
     */
    async loadModule(file: string | URL): Promise<void> {
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

            if (!command.name) {
                console.error(`\nError in ${file}: You must provide a name for your command!`);
                this.erroredFiles.add(file);
                return;
            }

            this.commands[command.name] = command;
            //@ts-expect-error Yeah that's why I'm deleting it.
            delete this.commands[command.name].name;
            return;
        }

        const commandMap = importedCommands as CommandMap;
        Object.assign(this.commands, commandMap);
    }

    /**
     * Loads modules from a directory recursively.
     * Any errors thrown anywhere in the process will be caught and logged to the console.
     * @param directory The directory to get the modules from.
     * @returns A promise which resolves once the modules have been loaded.
     */
    async loadDirectory(directory: string | URL): Promise<void> {
        if (typeof directory != "string") directory = fileURLToPath(directory);

        const files = await walkDirectory(directory);
        const modules = files
            .filter( file => file.name.endsWith(".js"))
            .map( file => this.loadModule(file.path));

        await Promise.all(modules);
    }

    /**
     * Checks whether the specified user is blocked.
     * @param userID A user's session ID or an object with an ID and/or session ID in it.
     * @param userSessionID A user's session ID.
     * @returns A boolean value indicating whether the user is blocked.
     */
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