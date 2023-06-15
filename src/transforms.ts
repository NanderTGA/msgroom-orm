import { Message, User } from "./events";
import { RawMessage, RawUser } from "./socket.io";

import { decode as decodeHTML } from "he";

export function transformUser(rawUser: RawUser): User {
    return {
        color    : rawUser.color,
        flags    : rawUser.flags,
        ID       : rawUser.id,
        sessionID: rawUser.session_id,
        nickname : rawUser.user,
    };
}

export function transformMessage(rawMessage: RawMessage, onlineUsers: User[]): Message {
    return {
        type: rawMessage.type,

        color  : rawMessage.color,
        content: decodeHTML(rawMessage.content),
        date   : new Date(rawMessage.date),
        author : onlineUsers.find( user => user.sessionID == rawMessage.session_id) || {
            color    : "#ff0000",
            flags    : [],
            ID       : "unknown ID",
            sessionID: "unknown session ID",
            nickname : "unknown user",
        },
    };
}