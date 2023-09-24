---
sidebar_position: 1
---

# Getting Started

## Installation

First, let's install the latest v2 build.

```bash npm2yarn
npm install msgroom@nightly
```

:::warning

The nightly builds get updates all the time which could contain breaking changes.
These builds can also be unstable, so use them at your own risk.
(Generally it's fine though.)

:::

## API documentation

Before we start, you should know everything in this library is fully typed and most things have TSDoc comments explaining what they do.
If you want to know what something does, hover over it in your IDE or find the associated documentation on it here.

The TSDoc comments and types are also used to automatically generate the API docs, which you can find under the API section in the sidebar to your left.

You will find 3 sections there, but you probably will only need the `Classes` section and the `Interfaces` section.
Most things in the `Modules` section are probably only useful to you if you are a library developer or are interested in the internal workings of this library.
You can find [the map of events](/msgroom-orm/docs/api/modules/types_events#clientevents) there though, which can be pretty useful to have.

When you are on one the pages of the API docs, it might look overwhelming at first, but don't worry, it's not as complicated as it looks at first.
You can use the sidebar to your right or the search feature in the top right corner to find what you're looking for.

## Creating a client

First, create a new client and connect
(the package exports commonJS, so you can use require too)

```js
import Client from "msgroom";

const client = new Client("TestBot", "!");

// insert some very cool commands here

await client.connect();
```

## Defining commands

:::tip

Don't create your own help command, there already is a built-in one.

:::

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

![example command usage](https://github.com/NanderTGA/msgroom-orm/blob/main/example%20command%20usage.png?raw=true)
