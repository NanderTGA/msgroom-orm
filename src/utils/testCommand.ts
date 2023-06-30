import Client from "..";
import { Message } from "../types/events";
import { CommandHandler } from "../types/types";

export default async function getCommandOutput(client: Client, command: string, message?: Omit<Message, "content">): Promise<Awaited<ReturnType<CommandHandler>>> {
    const output: string[] = [];

    const fakeMessage = message || {
        author: {
            color    : "#ff0000",
            flags    : [],
            ID       : "some-id",
            sessionID: "some-session-id",
            nickname : "Someone",
        },
        color: "#ff0000",
        date : new Date(),
        type : "text",
    };

    await client.processCommands({
        message: {
            ...fakeMessage,
            content: command,
        },
        send: (...messages) => {
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