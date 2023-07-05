import { Message, NickChangeInfo, SysMessage, User } from "../types/events";
import { RawMessage, RawNickChangeInfo, RawSysMessage, RawUser } from "../types/socket.io";
import { Command, NormalizedCommand } from "../types/types";

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

export function transformMessage(rawMessage: RawMessage, onlineUsers: Record<string, User>): Message {
    return {
        type: rawMessage.type,

        color  : rawMessage.color,
        content: decodeHTML(rawMessage.content),
        date   : new Date(rawMessage.date),
        author : onlineUsers[rawMessage.session_id],
    };
}

export function transformNickChangeInfo(rawNickChangeInfo: RawNickChangeInfo, onlineUsers: Record<string, User>): NickChangeInfo {
    return {
        user: onlineUsers[rawNickChangeInfo.session_id],

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

export function normalizeCommand(command: Command): NormalizedCommand {
    return {
        description: command.description || "No description provided.",
        aliases    : command.aliases || [],
        handler    : command.handler,
    };
}