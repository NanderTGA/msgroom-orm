import { Message } from "./events";
import type Client from "..";

export type LogFunction = (...args: string[]) => void;
export type CommandHandler = (context: CommandContext, ...args: string[]) => (Promise<string | string[] | void> | string | string[] | void);
export type Command = {
    description?: string;
    aliases?: string[][]
    handler: CommandHandler;
    subcommands?: CommandMap
};
export type NormalizedCommand = Required<Command>;
export type CommandMap = {
    [command: string]: Command;
};

export type CommandWithName = Command & { name: string };
export type ModuleInitializeFunctionReturnType = CommandWithName | CommandMap | void;
export type ModuleInitializeFunction =
    ( (client: Client) => ModuleInitializeFunctionReturnType ) |
    ( (client: Client) => Promise<ModuleInitializeFunctionReturnType> );
export type CommandFileExports = {
    default: ModuleInitializeFunction | { default: ModuleInitializeFunction }
};

export type WalkFunction = (
    command: NormalizedCommand,
    fullCommand: string[],
) => void;

export type CommandContext = {
    /** The message that triggered the command */
    message: Message;

    /** Will send a message. */
    send: LogFunction;

    /** Like send(), but will tag the user. */
    reply: LogFunction;
};