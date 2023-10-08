---
sidebar_position: 2
---

# Subcommands

You can define a subcommand on a command using its subcommands field.
And yes, subcommands can have subcommands, and those subcommands can have subcommands too.
There is no limit on how far you can go.

## Usage

```js
client.commands.ping = {
    description: "Ping pong!",
    handler: () => "Pong!",
    subcommands: {
        pong: { // this is any normal command, which can have its own subcommands and aliases and such
            description: "Ping pong peng!",
            handler: () => "Peng!"
        }
    }
}
```

## Example

Here's an example taken from TestBot.

```js
client.commands.subCommandTest =  {
    description: "hey look at that I can have a description now!",
    handler    : () => "nothing?",
    subcommands: {
        sub1      : { handler: () => "first subcommand" },
        sub2      : { handler: () => "another subcommand" },
        subCommand: {
            description: "This is a subcommand.",
            handler    : () => "Not implemented.",
            subcommands: {
                subSubcommand: {
                    description: "This is a subcommand of a subcommand.",
                    handler    : () => "This is a subcommand of a subcommand.",
                },
                stuff2: {
                    description: "I wonder what this one does.",
                    handler    : () => {
                        throw new Error("Hey, when did this command start throwing errors?");
                    },
                    subcommands: {
                        sub: { handler: () => "yes subcommand" },
                    },
                },
            },
        },
    },
};
```
