import Client from ".";

void (async () => {
    const client = new Client("[g!] TestBot", [ "g!" ]);
    const userID = await client.connect();

    client.on("message", message => {
        if (message.id == userID) return;
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
})();