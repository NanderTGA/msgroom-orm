import io from "socket.io-client";
import type MsgroomSocket from "#types/socket.io.js";

import { fileURLToPath, pathToFileURL } from "url";
import arrayStartsWith from "#utils/arrayStartsWith.js";

import { promisify } from "util";
import { walk } from "@nodelib/fs.walk";
const walkDirectory = promisify(walk);

import { EventEmitter } from "node:events";
import type TypedEmitter from "typed-emitter";

import type { default as ClientEvents, User } from "#types/events.js";
import type {
    CommandMap, CommandContext, CommandFileExports, CommandWithName,
    Command, WalkFunction, NormalizedCommand, ClientOptions,
} from "#types";

import { AuthError, ConnectionError, NotConnectedError } from "./errors.js";
import { normalizeCommand, transformUser, trimMessage } from "#utils/transforms.js";
import helpCommand from "./helpCommand.js";
import { applyMainEventHandlers } from "./eventHandlers.js";

export default class Client extends (EventEmitter as unknown as new () => TypedEmitter.default<ClientEvents>) {
    socket?: MsgroomSocket;
    #name: string;
    server: string;

    printErrors: boolean;
    helpSuffix: string;
    blockSelf: boolean;
    /** @deprecated This option has been removed. As a general rule, bots should not send messages if the user doesn't explicitly ask for them. */
    welcomeMessage?: string;
    apikey?: string;
    unescapeMessages: boolean;
    helpCommandLimit: number;
    
    prefixes: Set<string | RegExp>;
    mainPrefix: string | RegExp;

    users: Record<string, User> = {};
    #ID?: string;
    #sessionID?: string;
    blockedIDs = new Set<string>();
    blockedSessionIDs = new Set<string>();
    bot: boolean;
    blockBots: boolean;
    /** Cannot be changed after connecting. */
    socketIOOptions: ClientOptions["socketIOOptions"];
    /** Cannot be changed after connecting. */
    authOptions: ClientOptions["authOptions"];

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
        options: Partial<ClientOptions> = {},
    ) {
        super();

        this.validateNickname(name, true);
        this.#name = name;

        const commandPrefixesArray = Array.isArray(commandPrefixes) ? commandPrefixes : [ commandPrefixes ];
        this.mainPrefix = options.mainPrefix ?? commandPrefixesArray[0];
        this.prefixes = new Set(commandPrefixesArray);

        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
        this.server = options.server || "wss://msgroom.windows96.net";
        this.socketIOOptions = options.socketIOOptions ?? {};
        this.authOptions = options.authOptions ?? {};
        this.printErrors = options.printErrors ?? true;
        this.helpSuffix = options.helpSuffix ?? "";
        this.apikey = options.apikey;
        this.unescapeMessages = options.unescapeMessages ?? true;
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
        this.helpCommandLimit = options.helpCommandLimit || 15;
        
        this.bot = options.bot ?? true;
        this.blockBots = options.blockBots ?? this.bot;
        this.blockSelf = options.blockSelf ?? this.bot;
        if (options.welcomeMessage) console.warn("The welcomeMessage option has been removed. As a general rule, bots should not send messages if the user doesn't explicitly ask for them.");

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

            this.socket = io(this.server, this.socketIOOptions);
            this.socket //! don't remove this line, you'd break the types

            //#region connecting to the server
                .on("connect", () => {
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    this.socket!.emit("auth", {
                        user  : this.name,
                        apikey: this.apikey,
                        bot   : this.bot,
                        ...this.authOptions,
                    });
                })
                .on("disconnect", () => {
                    this.emit("disconnected");
                })
                .on("connect_error", () => {
                    reject(new ConnectionError());
                })
                .on("auth-complete", (authenticatedUserID, sessionID) => {
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    this.socket!.emit("online");

                    userID = authenticatedUserID;
                    this.#sessionID = sessionID;

                    if (this.welcomeMessage) console.warn("The welcomeMessage option has been removed. As a general rule, bots should not send messages if the user doesn't explicitly ask for them.");
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
        }).then( () => void applyMainEventHandlers(this, name => this.#name = name));
    }

    /**
     * Validates a nickname.
     * A nickname should be 1-16 characters.
     * @param name The nickname to validate.
     * @param onJoin Whether the nickname is passed to the `auth` event, which checks for a length of 18 characters.
     * @throws An {@link Error} when the criteria has not been met.
     */
    validateNickname(name: string, onJoin = false) {
        const maximumLength = onJoin ? 18 : 16;
        if (name.length > maximumLength) throw new Error(`Username is longer than ${maximumLength} characters.`);
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

        const message = trimMessage(messages.join(" "));
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
                    if (testCommand(
                        command,
                        Array.isArray(alias) ? alias : [ alias ],
                    )) return;
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
User: ${context.message.author.escapedName}
User's ID: ${context.message.author.ID}
User's session ID: ${context.message.author.sessionID}
Full error:
`, error);
        }
    }

    parseCommandCall(commandCall: string): string[] {
        const args = [];
        let currentArgument = "";
        let isInQuotes = false;

        for (let i = 0; i < commandCall.length; i++) {
            const character = commandCall[i];
            const nextCharacter = commandCall[i + 1];

            if (character === "\\" && nextCharacter === `"`) {
                currentArgument += `"`;
                i++;
            } else if (character === `"`) isInQuotes = !isInQuotes;
            else if (character === " " && !isInQuotes) {
                args.push(currentArgument);
                currentArgument = "";
            } else currentArgument += character;
        }
        args.push(currentArgument);

        return args;
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
        const parsedArguments = this.parseCommandCall(messageWithoutPrefix);

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
            const fileExports = await import(file) as CommandFileExports;
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

    public isBot(sessionID: string): boolean {
        return this.users[sessionID].flags.includes("bot");
    }

    /**
     * Checks whether the specified user is blocked.
     * @param userID A user's ID or an object with an ID, sessionID, and/or blockBots property.
     * @param userSessionID A user's session ID.
     * @param blockBots Whether to block bots too. Defaults to the blockBots option.
     * @returns A boolean value indicating whether the user is blocked.
     * @example
     * client.isBlocked("user-id-here", "session-id-here");
     * client.isBlocked({
     *     ID: "user-id-here", // you can leave any of these out
     *     sessionID: "session-id-here",
     *     blockBots: true,
     * });
     *
     * client.isBlocked("bad-user-id", "some session id"); // false
     * client.blockedIDs.add("bad-user-id");
     * client.isBlocked("bad-user-id", "some session id"); // true
     */
    public isBlocked(userID: string, userSessionID?: string, blockBots?: boolean): boolean;
    public isBlocked(userIDOrObject: { ID?: string, sessionID?: string, blockBots?: boolean }): boolean;
    public isBlocked(
        userIDOrObject: string | { ID?: string, sessionID?: string, blockBots?: boolean },
        userSessionID?: string,
        blockBotsArg?: boolean,
    ): boolean {
        let ID: string | undefined;
        let sessionID: string | undefined;
        let blockBots: boolean | undefined;
        if (typeof userIDOrObject == "object") {
            ID = userIDOrObject.ID;
            sessionID = userIDOrObject.sessionID;
            blockBots = userIDOrObject.blockBots;
        } else {
            ID = userIDOrObject;
            sessionID = userSessionID;
            blockBots = blockBotsArg;
        }

        blockBots ??= this.blockBots;

        let blocked = false;

        if (ID) blocked ||= this.blockedIDs.has(ID);
        if (sessionID) {
            blocked ||= this.blockedSessionIDs.has(sessionID);
            if (blockBots) blocked ||= this.isBot(sessionID);
        }

        return blocked;
    }
}