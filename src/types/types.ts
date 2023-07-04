import { Message } from "./events";
import type Client from "..";

export type LogFunction = (...args: string[]) => void;
export type CommandHandler = (context: CommandContext, ...args: string[]) => (Promise<string | string[] | void> | string | string[] | void);
export type Command = {
    description?: string;
    aliases?: string[]
    handler: CommandHandler;
};
export type CommandHandlerMap = {
    [command: string]: CommandHandlerMapEntry;
};
export type CommandHandlerMapEntry = Command | CommandHandlerMap;

export type CommandWithName = Command & { name: string };
export type ModuleInitializeFunctionReturnType = Promise<CommandWithName | CommandHandlerMap> | CommandWithName | CommandHandlerMap;
export type ModuleInitializeFunction = (client: Client) => ModuleInitializeFunctionReturnType;
export type CommandFileExports = {
    default: ModuleInitializeFunction
};

export type CommandContext = {
    /** The message that triggered the command */
    message: Message;

    /** Will send a message. */
    send: LogFunction;

    /** Will tag the user. */
    reply: LogFunction;
};