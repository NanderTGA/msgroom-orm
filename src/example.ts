import Client from ".";

void (async () => {
    const client = new Client("[!] TestBot", [ "!" ]);

    client.on("message", message => {
        if (message.id == client.userID) return;
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

    client.commands.ping = reply => {
        reply("pong");
    };

    client.commands.repeat = (reply, ...args) => {
        reply(args.join(" "));
    };
    
    await client.connect();
})();