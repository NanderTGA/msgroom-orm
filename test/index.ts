import { it } from "@jest/globals";
import Client from "../src/index";

it.skip("should connect, send a message and disconnect", async () => {
    const client = new Client("[!] TestBot", "!");
    const messageToSend = "Hi there! Sorry for the spam.";
    await client.connect();

    client.on("message", message => {
        if (message.author.ID == client.userID && message.content == messageToSend) client.disconnect();
    });

    client.sendMessage(messageToSend);
});