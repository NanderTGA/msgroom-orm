import { Message, NickChangeInfo, SysMessage, User } from "../events";
import { RawMessage, RawNickChangeInfo, RawSysMessage, RawUser } from "../socket.io";

import { decode as decodeHTML } from "he";
import getUser from "./getUser";

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
        author : getUser(onlineUsers, rawMessage.session_id),
    };
}

export function transformNickChangeInfo(rawNickChangeInfo: RawNickChangeInfo, onlineUsers: User[]): NickChangeInfo {
    return {
        user: getUser(onlineUsers, rawNickChangeInfo.session_id),

        oldNickname: rawNickChangeInfo.oldUser,
        newNickname: rawNickChangeInfo.newUser,
    };
}

export function transformSysMessage(rawSysMessage: RawSysMessage): SysMessage {
    return {
        type: rawSysMessage.type,

        message: rawSysMessage.message,
        isHTML : rawSysMessage.isHtml,
    };
}