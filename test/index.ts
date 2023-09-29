import { it } from "@jest/globals";
import Client from "#client";

it("should connect, send a message and disconnect", async () => {
    const client = new Client("JestBot", "", { blockSelf: false });
    const messageToSend = "Hi there! Sorry for the spam.";

    const done = new Promise<void>( resolve => {
        client.on("message", message => {
            if (!(message.author.ID == client.ID && message.content == messageToSend)) return;
            client.disconnect();
            resolve();
        });
    });
        
    await client.connect();
    client.sendMessage(messageToSend);
    await done;
});