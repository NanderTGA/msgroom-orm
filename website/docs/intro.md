---
sidebar_position: 1
---

# Getting Started

## Installation

First, let's install the latest v2 build.

`$ npm i msgroom@nightly`

:::warning

The nightly builds get updates all the time which could contain breaking changes.
These builds can also be unstable, so use them at your own risk.
(Generally it's fine though.)

:::

## Creating a client

First, create a new client and connect
(the package exports commonJS, so you can use require too)

```js
import Client from "msgroom";

const client = new Client("TestBot", "!");

// insert some very cool commands here

await client.connect();
```

For more information about any functions/variables/properties,
hover over them in your IDE.
This package is fully typed.

You can listen for any events you like using `client.on` (or `client.addListener`).

A map of events can be found in `src/events.ts` or in `dist/events.d.ts`.

## Defining commands

To define a command, define a property on `client.commands`.
The name of the property will be the name of your command.
The property should have a handler property, which should be a function that is called with

1. The `context` object, this contains information about the message that triggered the command (e.g. date and time, the user who triggered the command). It also has `context.send()` and `context.reply()` functions. The send function sends a message and the reply function sends a message prefixed with a ping to the corresponding user (looks somewhat like this: **@User who triggered command** your reply here).
2. Any number of arguments, depending on how much the user passed when invoking the command. These arguments are all strings.

It can also have some other properties like aliases, a descriptions and subcommands.
TODO: write docs for these.

Some examples:

```js
client.commands.ping = {
    description: "Replies with Pong!",
    handler    : () => "Pong!",
};

client.commands.repeat = {
    description: "Repeats what you said.",
    handler    : (context, ...args) => {
        return args.join(" ");
    },
};
```

You can, after defining these commands, use them by sending a message like this:

![example command usage](https://github.com/NanderTGA/msgroom-orm/blob/master/example%20command%20usage.png?raw=true)
