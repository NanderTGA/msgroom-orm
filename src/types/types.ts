import { Message } from "./events";
import type Client from "..";

export type LogFunction = (...args: string[]) => void;
// I need to because typescript is behaving weirdly again
// eslint-disable-next-line @typescript-eslint/no-invalid-void-type
export type CommandHandlerReturnValue = string | string[] | void;
export type CommandHandler = (context: CommandContext, ...args: string[]) => (Promise<CommandHandlerReturnValue> | CommandHandlerReturnValue);
export interface Command {
    description?: string;
    aliases?: string[][]
    handler: CommandHandler;
    subcommands?: CommandMap
}
export type NormalizedCommand = Required<Command>;
export type CommandMap = Record<string, Command>;

export type CommandWithName = Command & { name: string };
export type ModuleInitializeFunctionReturnType = CommandWithName | CommandMap | undefined | null;
export type ModuleInitializeFunction =
    ( (client: Client) => ModuleInitializeFunctionReturnType ) |
    ( (client: Client) => Promise<ModuleInitializeFunctionReturnType> );
export interface CommandFileExports {
    default?: ModuleInitializeFunction | { default?: ModuleInitializeFunction }
}

export type WalkFunction = (
    command: NormalizedCommand,
    fullCommand: string[],
) => void;

export interface CommandContext {
    /** The message that triggered the command */
    message: Message;

    /** Will send a message. */
    send: LogFunction;

    /** Like send(), but will tag the user. */
    reply: LogFunction;
}

export interface ClientOptions {
    /** The server to connect to. */
    server?: string,
    /** Whether to print errors to the console. */
    printErrors?: boolean,
    /** A suffix to add to the output of the help command. */
    helpSuffix?: string,
    /** Whether the bot should block itself. Will force welcomeMessage to be sent. */
    blockSelf?: boolean,
    /** A message to send when the bot joins. */
    welcomeMessage?: string,
    /**
     * The main prefix to use in commands (for example, the help command will use this to tell the user what prefix they should use).
     * This shouldn't have regex in it.
     * Set this to an empty string to disable the command system.
     */
    mainPrefix?: string | RegExp,
    /** You can request one from ctrlz. */
    apikey?: string
}