import Client from "..";

import { formatWithOptions } from "node:util";

void (async () => {
    const client = new Client("[!] TestBot", [ "!", /^t!/i ], {
        printErrors: true,
        helpSuffix : `
*TestBot is a bot made by NanderTGA to test new [msgroom](https://npmjs.com/package/msgroom) features before releasing them.
Things may also seem broken when it's intended behavior to test a feature.
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
        description: "Replies with Pong!",
        handler    : () => "Pong!",
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

    await client.addCommandsFromDirectory();
    await client.connect();

    // will cause a werror
    client.sendMessage("a".repeat(2049));
})();