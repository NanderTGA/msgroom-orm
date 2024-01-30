import type { ServerToClientEventsWithReserved } from "./types/socket.io.js";
import type Client from "./index.js";

import { transformMessage, escapeName, transformSysMessage, transformNickChangeInfo, transformUser } from "./utils/transforms.js";

export type EventHandlersObject = {
    [K in keyof ServerToClientEventsWithReserved]?: EventHandlerFunction<K>;
};

export type EventHandlerArguments<K extends keyof ServerToClientEventsWithReserved = keyof ServerToClientEventsWithReserved>
    = Parameters<ServerToClientEventsWithReserved[K]>;
export type EventHandlerFunction<K extends keyof ServerToClientEventsWithReserved = keyof ServerToClientEventsWithReserved>
    = (this: Client, ...args: [ ...EventHandlerArguments<K>, setCachedName: (name: string) => void ]) => void;

const mainEventHandlers: EventHandlersObject = {
    werror(reason) {
        this.emit("werror", reason);
    },

    message(rawMessage) {
        let message = transformMessage(rawMessage, this.users, this.unescapeMessages);

        if (this.isBlocked(message.author.ID, message.author.sessionID, false)) return;

        const messageFromSocialMediaBridgeMatch = /^\[(\w+)\] <strong>(\w+) \((\d+)\)<\/strong>:\n(.*)/.exec(message.content);
        if (messageFromSocialMediaBridgeMatch) {
            const [ , socialMediaApp, name, ID, extractedMessage ] = messageFromSocialMediaBridgeMatch;
            const originalMessage = message;
            const socialMediaUser = {
                name,
                ID,
            };
            const bridgedID = `BRIDGED-BY:${originalMessage.author.ID}-FROM:${socialMediaApp}-${socialMediaUser.name}-${socialMediaUser.ID}`;
            message = {
                type   : message.type,
                color  : message.color,
                content: extractedMessage,
                date   : message.date,
                author : {
                    color      : message.author.color,
                    flags      : [],
                    ID         : bridgedID,
                    sessionID  : `${bridgedID}-0`,
                    nickname   : name,
                    escapedName: escapeName(name),
                },
                bridged: {
                    originalMessage,
                    socialMediaApp,
                    socialMediaUser,
                },
            };
        }

        if (this.isBlocked(message.author)) return;

        this.emit("message", message);
        void this.processCommands({
            message,
            send : (...args) => void this.sendMessage(...args),
            reply: (...args) => void this.sendMessage(`**@${message.author.escapedName}**`, ...args),
        });
    },

    "sys-message"(rawSysMessage) {
        const sysMessage = transformSysMessage(rawSysMessage);
        this.emit("sys-message", sysMessage);
        //@ts-expect-error Don't worry, it's fine. Think about it, you'll understand.
        this.emit(`sys-message-${sysMessage.type}`, sysMessage);
    },

    "nick-changed"(rawNickChangeInfo, setCachedName) {
        const nickChangeInfo = transformNickChangeInfo(rawNickChangeInfo, this.users);

        if (nickChangeInfo.user.sessionID === this.sessionID) setCachedName(nickChangeInfo.newNickname);
                    
        nickChangeInfo.user.nickname = nickChangeInfo.newNickname;
        nickChangeInfo.user.escapedName = escapeName(nickChangeInfo.newNickname);
                    
        if (this.isBlocked(nickChangeInfo.user)) return;
        this.emit("nick-change", nickChangeInfo);
    },

    "user-join"(rawUser) {
        const user = transformUser(rawUser);
        this.users[user.sessionID] = user;

        if (this.isBlocked(user)) return;
        this.emit("user-join", user);
    },

    "user-leave"(userLeaveInfo) {
        const user = this.users[userLeaveInfo.session_id];

        if (!this.isBlocked(user)) this.emit("user-leave", user);

        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete this.users[userLeaveInfo.session_id];
    },

    "user-update"(userUpdateInfo) {
        const user = this.users[userUpdateInfo.user];
                    
        switch (userUpdateInfo.type) {
            case "tag-add":
                if (!userUpdateInfo.tag?.trim() || !userUpdateInfo.tagLabel) return;

                if (!user.flags.includes(userUpdateInfo.tag)) user.flags.push(userUpdateInfo.tag);

                if (this.isBlocked(user)) return;
                this.emit("tag-add", {
                    user,
                    newTag     : userUpdateInfo.tag,
                    newTagLabel: userUpdateInfo.tagLabel,
                });
                break;

            default:
                console.error("Invalid userUpdateInfo type", userUpdateInfo);
                break;
        }
    },
};

export function applyMainEventHandlers(client: Client, setCachedName: (name: string) => void): void {
    for (const [ event, handler ] of Object.entries(mainEventHandlers) as [
        keyof EventHandlersObject,
        EventHandlerFunction,
    ][]) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        client.socket!.on(event, (...args: EventHandlerArguments) => {
            try {
                handler.call(client, ...args, setCachedName);
            } catch (error) {
                console.error(`An error occurred while handling ${event}. Please report this problem to the server owner.`, error);
            }
        });
    }
}