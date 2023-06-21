export type LogFunction = (...args: string[]) => void;
export type CommandHandler = (reply: LogFunction, ...args: string[]) => (Promise<string | string[] | void> | string | string[] | void);
export type CommandHandlerMap = {
    [key: string]: CommandHandler | CommandHandlerMap;
};