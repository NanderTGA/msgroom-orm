import { Message } from "./events";
import type Client from "..";

export type LogFunction = (...args: string[]) => void;
export type CommandHandler = (context: CommandContext, ...args: string[]) => (Promise<string | string[] | void> | string | string[] | void);
export type Command = {
    description?: string;
    aliases?: string[]
    handler: CommandHandler;
};
export type NormalizedCommand = Required<Command>;
export type CommandMap = {
    [command: string]: CommandMapEntry;
};
export type CommandMapEntry = Command | CommandMap;

export type CommandWithName = Command & { name: string };
export type ModuleInitializeFunctionReturnType = Promise<CommandWithName | CommandMap> | CommandWithName | CommandMap;
export type ModuleInitializeFunction = (client: Client) => ModuleInitializeFunctionReturnType;
export type CommandFileExports = {
    default: ModuleInitializeFunction | { default: ModuleInitializeFunction }
};

export type WalkFunction = (
    commandOrMap: {
        commandMap?: CommandMap,
        command?: NormalizedCommand
    },
    name: string,
    fullCommand: string[]
) => void;

export type CommandContext = {
    /** The message that triggered the command */
    message: Message;

    /** Will send a message. */
    send: LogFunction;

    /** Like send(), but will tag the user. */
    reply: LogFunction;
};