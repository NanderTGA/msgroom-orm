import { CommandHandler } from "../types/types";

class Command {
    static default = Command;

    constructor(
        public description: string,
        public aliases: string[],
        public handler: CommandHandler,
    ) {}
}

export = Command;