import Client from "#client";

import { formatWithOptions } from "node:util";

const client = new Client("[!] TestBot", [ "!", /^test!/i ], {
    printErrors: true,
    helpSuffix : `
*TestBot is a bot made by NanderTGA to test new [MsgRoom.js](https://nandertga.github.io/msgroom-orm/) features before releasing them.
Some things may also seem broken when they are intentionally broken so I can test a specific feature.
Since it is completely useless, it will go offline once I'm done testing things.*
`.trim(),
    blockSelf: true,
});

client.on("message", message => {
    const monkey: Record<string, string> = {
        "hey"        : "hey",
        "gn"         : "gn",
        "gm"         : "gm",
        "goodmorning": "goodmorning",
        "goodnight"  : "goodnight",
        "who's joe?" : "Joe mama",
        "who's joe"  : "Joe mama",
    };
    if (monkey[message.content]) return void client.sendMessage(monkey[message.content]);
});

client.on("werror", reason => void console.warn("\nReceived werror:", reason));

client.commands.ping = {
    description: "Ping pong!",
    handler    : () => "Pong!",
    subcommands: {
        pong: { // this is any normal command, which can have its own subcommands and aliases and such
            description: "Ping pong peng!",
            handler    : () => "Peng!",
            aliases    : [
                "peng",
                [ "ping", "peng" ],
            ],
        },
    },
    aliases: [
        "pang",
    ],
};

client.commands.repeat = {
    description: "Repeats what you said.",
    handler    : (context, ...args) => args.join(" "),
};

client.commands.sendTest = {
    description: "Uses `context.send()` and `context.reply()` to send some replies.",
    handler    : context => {
        context.send("Sent!");
        context.reply("Replied!");
    },
};

client.commands.showContext = {
    description: "Returns the context argument.",
    handler    : context => formatWithOptions({ compact: false, colors: false }, context),
};

client.commands.testError = {
    description: "Throws an error.",
    aliases    : [
        [ "errorTest" ],
    ],
    handler: () => {
        throw new Error("fuck");
    },
};

client.commands.name = {
    description: "Tells you my name or changes it.",
    handler    : (context, ...nameParts) => {
        const newName = nameParts.join(" ");
        if (!newName) return client.name;
        client.name = newName;
    },
};

await client.loadDirectory(new URL("./modules", import.meta.url));
await client.connect();

// will cause a werror
client.sendMessage("a".repeat(2049));