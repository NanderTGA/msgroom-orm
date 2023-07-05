import { it } from "@jest/globals";
import Client from "../src/index";

it("should connect, send a message and disconnect", async () => {
    const client = new Client("JestBot", "very long prefix so nobody can trigger it!");
    const messageToSend = "Hi there! Sorry for the spam.";
    await client.connect();

    client.on("message", message => {
        if (message.author.ID == client.ID && message.content == messageToSend) client.disconnect();
    });

    client.sendMessage(messageToSend);
});