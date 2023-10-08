import type { Message } from "#types/events.js";
import type Client from "#client";

export type LogFunction = (...args: string[]) => void;
// I need to because typescript is behaving weirdly again
// eslint-disable-next-line @typescript-eslint/no-invalid-void-type
export type CommandHandlerReturnValue = string | string[] | void;
export type CommandHandler = (context: CommandContext, ...args: string[]) => (Promise<CommandHandlerReturnValue> | CommandHandlerReturnValue);
export interface Command {
    /**
     * A description for your command that will be shown in the help command.
     */
    description?: string;

    /**
     * A list of aliases for this command.
     * Check [the docs](https://nandertga.github.io/msgroom-orm/docs/commands/metadata) for more info.
     */
    aliases?: string[][];

    /**
     * The function that will handle any calls to this command (except for any subcommands).
     */
    handler: CommandHandler;

    /**
     * A CommandMap with subcommands in it.
     * Check [the docs](https://nandertga.github.io/msgroom-orm/docs/commands/subcommands) for more info.
     */
    subcommands?: CommandMap;
}
export type NormalizedCommand = Required<Command>;
export type CommandMap = Record<string, Command>;

export type CommandWithName = Command & { name: string };
// eslint-disable-next-line @typescript-eslint/no-invalid-void-type
export type ModuleInitializeFunctionReturnType = CommandWithName | CommandMap | void;
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
    /**
     * The server to connect to.
     * @default "wss://msgroom.windows96.net"
     */
    server?: string,
    /**
     * Whether to print errors to the console.
     * Will not stop printing of fatal errors while loading files.
     * @default true
     */
    printErrors?: boolean,
    /**
     * A suffix to add to the output of the help command.
     * @default ""
     */
    helpSuffix?: string,
    /**
     * Whether to ignore events triggered by the current user.
     * @default true
     */
    blockSelf?: boolean,
    /**
     * A message to send when the bot joins.
     * @default ""
     */
    welcomeMessage?: string,
    /**
     * The main prefix to use in commands (for example, the help command will use this to tell the user what prefix they should use).
     * This shouldn't have regex in it (although you can) because the average user can't read that.
     * Set this to an empty string to disable the command system.
     * @default "The first prefix passed in the constructor."
     */
    mainPrefix?: string | RegExp,
    /**
     * You can request one from ctrlz.
     * @default undefined
     */
    apikey?: string
    /**
     * Unescapes the incoming messages, meant for use in bots.
     * It's recommended to disable this when making a custom client.
     * @default true
     */
    unescapeMessages?: boolean
}