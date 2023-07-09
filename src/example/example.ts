import Client from "..";

import { formatWithOptions } from "node:util";

void (async () => {
    const client = new Client("[!] TestBot", [ "!" ], {
        printErrors: true,
        helpSuffix : `
*TestBot is a bot made by NanderTGA to test new [msgroom](https://npmjs.com/package/msgroom) features before releasing them.
Since it is completely useless, it will go offline once I'm done testing things.*
`.trim(),
    });

    client.on("message", message => {
        if (message.author.ID == client.ID) return;
        const monkey: Record<string, string> = {
            "hey"        : "hey",
            "gn"         : "gn",
            "gm"         : "gm",
            "goodmorning": "goodmorning",
            "goodnight"  : "goodnight",
            "who's joe?" : "Joe mama",
            "who's joe"  : "Joe mama",
        };
        if (monkey[message.content]) return client.sendMessage(monkey[message.content]);
    });

    client.on("werror", reason => console.warn("Received werror:", reason));

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
        aliases    : [ "errorTest" ],
        handler    : () => {
            throw new Error("fuck");
        },
    };

    client.commands.subCommandTest = {
        sub1         : { handler: () => "first subcommand" },
        sub2         : { handler: () => "another subcommand" },
        undefined    : { handler: () => "nothing?" },
        subSubCommand: {
            stuff : { handler: () => "some stuff here" },
            stuff2: {
                undefined: {
                    handler: () => {
                        throw new Error("Hey, when did this command start throwing errors?");
                    },
                },
                sub      : { handler: () => "yes subcommand" },
                testError: client.commands.testError,
            },
        },
    };

    await client.addCommandsFromDirectory();
    
    await client.connect();

    // will cause a werror
    client.sendMessage("a".repeat(2049));
})();