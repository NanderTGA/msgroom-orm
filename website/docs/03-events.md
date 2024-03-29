# Events

You can listen for events using [`client.on`](/msgroom-orm/docs/api/classes/index.Client#on).

:::danger

The events received from the server (using socket.on, the main way to listen for events in other libraries) are different from these events.
All event data is transformed to be easier to use.

:::

An example:

```js
client.on("message", message => {
    console.log("Hey look mom I got a message!");
});
```

We also have all the other usual event emitter methods, like off, once and listeners.

Some useful links:

[EventEmitter documentation](https://nodejs.org/api/events.html#class-eventemitter)

[The map of events](/msgroom-orm/docs/api/interfaces/types_events.ClientEvents)
