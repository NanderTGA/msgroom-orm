# msgroom

## A Msgroom client

[![Wallaby.js](https://img.shields.io/badge/wallaby.js-powered-blue.svg?style=flat&logo=github)](https://wallabyjs.com/oss/)

**NOTE: This is <ins>not</ins> the official msgroom package!**

Available on npm: `npm i msgroom`

There are plans to include a msgroom server in the future.

## How to use

### Getting started

First, create a new client and connect
(the package exports commonJS, so you can use require too)

```js
import Client from "msgroom";

const client = new Client("TestBot", [ "!" ]);
await client.connect();
```

For more information about any functions/variables/properties,
hover over them in your IDE.
This package is fully typed.

You can listen for any events you like using `client.on` (or `client.addListener`).

A map of events can be found in `src/events.ts` or in `dist/events.d.ts`.

### Defining commands

To define a command, define a property on `client.commands`.
The name of the property will be the name of your command.
This property should be a function that is called with

1. A `reply` function, this function will concatenate all arguments passed to it together with spaces in between them and send the resulting string as a message.
2. Any number of arguments, depending on how much the user passed when invoking the command. These arguments are all strings.

Some examples:

```js
client.commands.ping = () => "pong";

client.commands.repeat = (reply, ...args) => {
    return args.join(" ");
};
```

You can, after defining these commands, use them by sending a message like this:

![example command usage](https://github.com/NanderTGA/msgroom-orm/blob/master/example%20command%20usage.png?raw=true)

### Blocking users

To block a user, add their ID or session ID to `client.blockedIDs` or `client.blockedSessionIDs` respectively.
These 2 properties are [Set](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set)s.

You can then check if a user is blocked using `client.isBlocked()`.
Any events caused by blocked users will be ignored, so you likely won't need this method.
This method accepts either

- An ID, and optionally a session id:

```js
client.isBlocked("user-id-here", "session-id-here")
```

- Or an object containing one or more of the following:

```js
client.isBlocked({
    id: "user-id-here",
    sessionID: "session-id-here",
    session_id: "session-id-here"
})
```

for example:

```js
client.isBlocked("bad-user-id", "some session id") // false
client.blockedIDs.add("bad-user-id")
client.isBlocked("bad-user-id", "some session id") // true
```

### Subcommands

You can now also define subcommands like this:

```js
client.commands.someSubommand = {
    subcommand: () => "You used the subcommand!", // user ran `!someSubcommand subcommand`
    undefined: () => "You didn't use any subcommands!", // user ran `!someSubcommand`
    anotherSubcommand: () => "You used another subcommand!", // user ran `!someSubcommand anotherSubcommand`
}
```

You can also nest subcommands like this:

```js
client.commands.something = {
    someSubcommand: {
        someSubSubcommand: () => "Look at that, a sub-subcommand" // user ran `!something someSubcommand someSubSubcommand`
    }
}
```

It comes down to one thing: you can now put an object with subcommands (like shown above) anywhere you can put a command handler function
