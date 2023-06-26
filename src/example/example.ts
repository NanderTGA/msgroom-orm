import Client from "..";
import Command from "../utils/Command";

import { formatWithOptions } from "node:util";

void (async () => {
    const client = new Client("[!] TestBot", [ "!" ], { printErrors: true });

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

    client.commands.ping = new Command("Replies with Pong!", [], () => "Pong!");

    client.commands.repeat = new Command("Repeats what you said.", [], (context, ...args) => {
        if (context.message.author.ID != client.ID) return "This command has been disabled for everyone who doesn't have the same ID as this bot due to abuse.";
        return args.join(" ");
    });

    client.commands.sendTest = new Command("Uses `context.send()` and `context.reply()` to send some replies.", [], context => {
        context.send("Sent!");
        context.reply("Replied!");
    });

    client.commands.showContext = new Command("Returns the context argument.", [], context => formatWithOptions({ compact: false, colors: false }, context));

    client.commands.testError = new Command("Throws an error.", [ "errorTest" ], () => {
        throw new Error("fuck");
    });

    client.commands.subCommandTest = {
        sub1         : new Command("", [], () => "first subcommand"),
        sub2         : new Command("", [], () => "another subcommand"),
        undefined    : new Command("", [], () => "nothing?"),
        subSubCommand: {
            stuff : new Command("", [], () => "some stuff here"),
            stuff2: {
                undefined: new Command("", [], () => {
                    throw new Error("Hey, when did this command start throwing errors?");
                }),
                sub      : new Command("", [], () => "yes subcommand"),
                testError: client.commands.testError,
            },
        },
    };

    await client.addCommandsFromDirectory();
    
    await client.connect();

    // will cause a werror
    client.sendMessage("123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890");
})();