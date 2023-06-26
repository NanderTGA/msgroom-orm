import { CommandHandler } from "../types/types";

export default class Command {
    constructor(
        public description: string,
        public aliases: string[],
        public handler: CommandHandler,
    ) {}
}