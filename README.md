# msgroom

## A Msgroom client

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

Commands are defined in a very simple way;
You simply define a property on `client.commands`.
The name of the property will be the name of your command.
This property should be a function that is called with

1. A `reply` function, this function will concatenate all arguments passed to it together with spaces in between them and send the resulting string as a message.
2. Any number of arguments, depending on how much the user passed when invoking the command. These arguments are all strings.

Some examples:

```js
client.commands.ping = reply => {
    reply("pong");
};

client.commands.repeat = (reply, ...args) => {
    reply(args.join(" "));
};
```

You can, after defining these commands, use them by sending a message like this:

![example command usage](https://github.com/NanderTGA/msgroom-orm/blob/master/example%20command%20usage.png?raw=true)
