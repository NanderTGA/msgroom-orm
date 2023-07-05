import io from "socket.io-client";
import MsgroomSocket from "./types/socket.io";

import { resolve } from "path";
import { fileURLToPath } from "url";
import { promisify } from "node:util";

import { walk } from "@nodelib/fs.walk";
const walkAsync = promisify(walk);

import { EventEmitter } from "node:events";
import TypedEmitter from "typed-emitter";
import ClientEvents, { User } from "./types/events";

import { AuthError, ConnectionError, NotConnectedError } from "./errors";
import { transformMessage, transformNickChangeInfo, transformSysMessage, transformUser } from "./utils/transforms";
import { CommandHandlerMap, CommandContext, CommandHandlerMapEntry, CommandFileExports, CommandWithName, Command } from "./types/types";

class Client extends (EventEmitter as unknown as new () => TypedEmitter<ClientEvents>) {
    private socket?: MsgroomSocket;
    #name: string;
    #server: string;
    printErrors: boolean;

    users: Record<string, User> = {};
    #ID?: string;
    blockedIDs = new Set<string>();
    blockedSessionIDs = new Set<string>();
    commandPrefixes: string[];

    commands: CommandHandlerMap = {
        help: {
            description: "Shows information about a command.",
            handler    : (context, ...args) => {
                if (args.length < 1) {
                    let output =  `
**The current ${this.commandPrefixes.length > 1 ? "prefixes are" : "prefix is"} \`${this.commandPrefixes.join("`, `")}\`
Here's a list of all available commands. For more information on a command, run \`${this.commandPrefixes[0]}help <command>\`
Commands are case-sensitive!**
`;
            
                    const iterateOverCommandHandlerMap = (commandHandlerMapEntry: CommandHandlerMapEntry, commandHandlerMapName: string, prefix: string) => {
                        this.validateCommandName(commandHandlerMapName);

                        if (typeof commandHandlerMapEntry.handler == "function") {
                            const command = commandHandlerMapEntry as Command;
                            if (commandHandlerMapName != "undefined") output += `\n${prefix}- *${command.description || "No description provided."}*`;
                            return;
                        }

                        const commandHandlerMap = commandHandlerMapEntry as CommandHandlerMap;
                        if (commandHandlerMapName) output += `\n${prefix}- *${commandHandlerMap.undefined?.description as string || "No description provided."}*`;
                
                        for (const key in commandHandlerMapEntry) {
                            iterateOverCommandHandlerMap(commandHandlerMap[key], key, `${prefix}${key} `);
                        }
                    };

                    iterateOverCommandHandlerMap(this.commands, "", this.commandPrefixes[0]);

                    return output.trim();
                }

                const commandName = args[0];
                args.splice(0, 1);

                const commandAndArguments = this.getCommand(commandName, args);
                if (!commandAndArguments) return "The command you specified cannot be found.";
                const [ command ] = commandAndArguments;

                const aliases = command.aliases || [];

                return  `
**Command:** ${command.name}
**Aliases:** ${aliases.length > 0 ? aliases.join(", ") : "*This command does not have any aliases*"}
**Description:** ${command.description || "*No description provided*" }
                    `;
            },
        },
    };
    
    static default = Client;

    /**
     * Creates a new msgroom client.
     * @param name The username to use.
     * @param commandPrefixes List of prefixes to be used for commands. Do note these *will be pasted directly in a regular expression*, so **make sure to escape any special characters!**
     * @param options Extra options.
     * @param options.server The server to connect to.
     * @param options.printErrors Whether to print errors to the console.
     */
    constructor(
        name: string,
        commandPrefixes: string | string[] = [],
        options: { server?: string, printErrors?: boolean } = {},
    ) {
        super();

        this.#name = name;
        this.commandPrefixes = typeof commandPrefixes == "string" ? [ commandPrefixes ] : commandPrefixes;

        this.#server = options.server || "wss://msgroom.windows96.net";
        this.printErrors = options.printErrors || false;
    }

    /**
     * Connect to a msgroom server. This should be the first function you run after creating a new instance of this class.
     * @param name The username you want to use.
     * @param server A URL to the server you want to connect to.
     * @param apikey You can request one from ctrlz.
     * @returns A promise which resolves when the connection has successfully been established.
     */
    async connect(name: string = this.#name, server = this.#server, apikey?: string): Promise<void> {
        return new Promise<void>( (resolve, reject) => {
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

                    this.#ID = userID;
                    resolve();
                });
            //#endregion

            this.socket.emit("auth", {
                user: name,
                apikey,
            });

        }).then( () => {
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
        let currentGottenCommand: CommandHandlerMapEntry = this.commands[command];
        let commandName = command;

        // eslint-disable-next-line no-constant-condition
        while (true) {
            if (typeof currentGottenCommand == "undefined") {
                // right now there are 2 possibilities:
                // either the command doesn't exist
                // or it does exist but as an alias to another command
                // oh god this is going to be a pain
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

            currentGottenCommand = (currentGottenCommand as CommandHandlerMap)[command];
            commandName += "." + command;
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
        const message = context.message.content;
        const regex = new RegExp(`^(${this.commandPrefixes.join(")|(")})`, "i"); // I checked and we should we safe from ReDoS
        if (!regex.test(message)) return;
        
        const commandArguments = message.replace(regex, "").split(" ");
        
        const commandName = commandArguments[0];
        commandArguments.splice(0, 1);

        const gottenCommand = this.getCommand(commandName, commandArguments);
        // We can safely assume there is at least one prefix, because otherwise this method wouldn't be called.
        if (!gottenCommand) return context.send(`That command doesn't exist. Run ${this.commandPrefixes[0]}help for a list of commands.`);

        const [ command, commandHandlerArguments ] = gottenCommand;
        await this.runCommand(command, commandHandlerArguments, context);
    }

    validateCommandName(this: void, commandName?: string) {
        if (typeof commandName != "string") throw new TypeError("A commandName must be a string.");
        if (commandName.indexOf(" ") >= 0) throw new Error("You cannot have spaces in a command name, this will cause your command to be unable to be invoked. Use subcommands instead.");
    }

    async addCommandsFromFile(file: string | URL): Promise<void> {
        if (typeof file != "string") file = file.href;
        //! This call to import() is replaced with something else by typescript, which uses require() under the hood! (because we're targeting commonJS)
        const { default: defaultFileExport } = await import(file) as CommandFileExports;
        if (!defaultFileExport) throw new Error(
            `${file} doesn't have a default export. The default export should be a function taking an instance of Client as the only argument and should return (a promise which resolves to) a CommandHandlerMapEntry.

If it returns a Command (any object which has a property named "handler" that resolves to a function), it will be registered accordingly to client.commands.
Do note that if you're returning a Command directly from a function, you also need to provide a property called name to provide the name of your command.

If it returns an object, it will be assumed to be a CommandHandlerMap and all of its properties will be assigned to client.commands using Object.assign().`,
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

        const commandHandlerMap = importedCommands as CommandHandlerMap;
        Object.keys(commandHandlerMap).forEach(this.validateCommandName);
        Object.assign(this.commands, importedCommands);
    }

    async addCommandsFromDirectory(directory?: string | URL): Promise<void> {
        if (!directory) {
            if (!require.main) throw new Error("You cannot leave out the directory argument in this context!");
            directory = resolve(require.main.path, "./commands");
        }
        if (typeof directory != "string") directory = fileURLToPath(directory);

        const files = await walkAsync(directory);
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