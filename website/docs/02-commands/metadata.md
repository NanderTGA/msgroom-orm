---
sidebar_position: 1
---

# Command Metadata

[Here](/msgroom-orm/docs/api/interfaces/types_types.Command)'s a full list of fields a command can have and their types.

You can provide metadata to a command through multiple fields.
Any field that is not `handler` is optional and can be left out.

Firstly, there's the `handler` field, which is the function that handles the command, and isn't metadata.
Then there's the second most important field: `description`.
You can use this to provide a description for your command that will be shown in the help command.

There's also the `subcommands` field, you can find out how to use it [here](./subcommands.md).

## Aliases

There's a field called `aliases`, which can be used to provide aliases for a command.
This field is a list of command paths.
The command path for `!ping pong` would be `[ "ping", "pong" ]`.
The one for `!ping` would be `[ "ping" ]`, which can be simplified to `"ping"`.
The one for `!ping pong peng` would be `[ "ping", "pong", "peng" ]`

An example aliases field would look like this:

NOTE: this example uses subcommands as well,
we recommend you go and read the [page about subcommands](./subcommands.md) in case you don't understand

```js
client.commands.ping = {
    description: "Ping pong!",
    handler: () => "Pong!",
    subcommands: {
        pong: { // this is any normal command, which can have its own subcommands and aliases and such
            description: "Ping pong peng!",
            handler: () => "Peng!",
            aliases: [
                "peng",
                [ "ping", "peng" ]
            ]
        }
    },
    aliases: [
        "pang",
    ]
}
```

In this example:

- `peng` is an alias for `ping pong`
- `ping peng` is an alias for `ping pong`
- `pang` is an alias for `ping`
- `pang pong` is NOT an alias for `ping pong`

To have an alias for `ping` that also includes `ping pong`, new behavior will be added in the future.
