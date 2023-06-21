import Client from "..";
import { CommandHandler } from "../types/types";

export default async function getCommandOutput(client: Client, commandName: string, commandHandler: CommandHandler, commandHandlerArguments: string[] = []): Promise<Awaited<ReturnType<CommandHandler>>> {
    const output: string[] = [];

    await client.runCommand(commandName, commandHandler, commandHandlerArguments, (...messages) => {
        const message = messages.join(" ");
        output.push(message);
    });

    return output;
}