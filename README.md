# msgroom

## A Msgroom client

**NOTE: This is <ins>not</ins> the official msgroom package!**

Available on npm: `npm i msgroom`

There are plans to include a msgroom server in the future.

## How to use

First, create a new client and connect
(the package exports commonJS, so you can use require too)

```js
import Client from "msgroom";

const client = new Client("TestBot", [ "!" ]);
const userID = await client.connect();
```

For more information about any functions/variables/properties,
hover over them in your IDE.
This package is fully typed.

You can listen for any events you like using `client.on` (or `client.addListener`).

A map of events can be found in `src/events.ts` or in `dist/events.d.ts`.

## Defining a command

```js
client.commands.ping = reply => {
    reply("pong");
};

client.commmands.repeat = (reply, ...args) => {
    reply(args.join(" "))
}
```
