import Client from "..";
import { Message } from "../types/events";
import { CommandHandler } from "../types/types";

export default async function getCommandOutput(client: Client, commandName: string, commandHandler: CommandHandler, commandHandlerArguments: string[] = []): Promise<Awaited<ReturnType<CommandHandler>>> {
    const output: string[] = [];

    const fakeMessage: Message = {
        author: {
            color    : "#ff0000",
            flags    : [],
            ID       : "some-id",
            sessionID: "some-session-id",
            nickname : "Someone",
        },
        color  : "#ff0000",
        content: "[NOT PROVIDED]",
        date   : new Date(),
        type   : "text",
    };

    await client.runCommand({
        name       : commandName,
        aliases    : [],
        description: "",
        handler    : commandHandler,
    }, commandHandlerArguments, {
        message: fakeMessage,
        send   : (...messages) => {
            const message = messages.join(" ");
            output.push(message);
        },
        reply: (...messages) => {
            const message = `@${fakeMessage.author.nickname}${messages.join(" ")}`;
            output.push(message);
        },
    });

    return output;
}