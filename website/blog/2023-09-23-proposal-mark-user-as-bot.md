---
slug: proposal-mark-users-as-bots-and-send-errors
title: "MsgRoom proposal: mark users as bots and send errors"
authors: [nandertga]
---

Dear Windows 96 team,

I have been developing this library for a few months now, but there are a few problems I encountered recently that I can't fix on the client side.
One of these is [the issue of not knowing who is a bot and who isn't](https://github.com/NanderTGA/msgroom-orm/issues/63),
which is the main reason why I'm making this proposal.

<!-- truncate -->

## Problems

1. The aforementioned issue is pretty annoying.
One bot can trigger another one, when it is in the best interest of both bots to not allow that behavior, because it will only lead to spam.
The solution here is to allow a user to mark themselves as a bot when connecting so other blocks know to ignore them.

2. More transparency on what's going on. I'm talking about telling people about bans, errors and ratelimits.
I got banned once due to an accidental infinite loop while messing around with some things.
I had to guess I was banned because the only thing that happened was nothing happening when trying to connect.
I wasn't told I was banned, nor was I told for how long and for what reason.
The worst thing was that I probably got banned by some spam detection system and I didn't know any active MsgRoom mods to help me out at the time.
So I had to wait it out and hope I'd get unbanned.
This behavior also completely breaks client logic in this library, because it expects to get the `auth-complete` or `auth-error` events,
and a timeout seems like a bad solution to me.

## Proposals

1. Add an option to the `auth` event to mark a user as a bot when connecting.
The user will then get the `bot` tag.
Perhaps you can hand out apikeys for "verified" bots, but I wouldn't really see the point in that, since nobody rehosts or impersonates other bots.

2. Use the `werror` and `auth-error` events to tell the user what's going on when they get ratelimited, banned, tried to send a message or set a nickname that's too long, etc.

Thank you for reading and taking my input into consideration.
