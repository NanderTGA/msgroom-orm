import { Message } from "./events";

export type LogFunction = (...args: string[]) => void;
export type CommandHandler = (context: CommandContext, ...args: string[]) => (Promise<string | string[] | void> | string | string[] | void);
export type CommandHandlerMap = {
    [key: string]: CommandHandler | CommandHandlerMap;
};

export type CommandContext = {
    /** The message that triggered the command */
    message: Message;

    /** Will send a message. */
    send: LogFunction;

    /** Will tag the user. */
    reply: LogFunction;
};