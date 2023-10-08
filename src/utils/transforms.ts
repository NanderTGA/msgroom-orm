import type { Message, NickChangeInfo, SysMessage, User } from "#types/events.js";
import type { RawMessage, RawNickChangeInfo, RawSysMessage, RawUser } from "#types/socket.io.js";
import type { Command, NormalizedCommand } from "#types";

import he from "he";
const { decode: decodeHTML } = he;

/**
 * Transforms a {@link RawUser} into a {@link User}.
 * @param rawUser The rawUser to transform.
 * @returns The transformed user.
 */
export function transformUser(rawUser: RawUser): User {
    return {
        color    : rawUser.color,
        flags    : rawUser.flags,
        ID       : rawUser.id,
        sessionID: rawUser.session_id,
        nickname : rawUser.user,
    };
}

/**
 * Transforms a {@link RawMessage} into a {@link Message}.
 * @param rawMessage The rawMessage to transform.
 * @param onlineUsers A {@link Record} of online users.
 * @param unescapeMessages Whether to unescape messages. True by default.
 * @returns The transformed message.
 */
export function transformMessage(rawMessage: RawMessage, onlineUsers: Record<string, User>, unescapeMessages = true): Message {
    return {
        type: rawMessage.type,

        color  : rawMessage.color,
        content: unescapeMessages ? decodeHTML(rawMessage.content) : rawMessage.content,
        date   : new Date(rawMessage.date),
        author : onlineUsers[rawMessage.session_id],
    };
}

/**
 * Transforms a {@link RawNickChangeInfo} into a {@link NickChangeInfo}.
 * @param rawNickChangeInfo The rawNickChangeInfo to transform.
 * @param onlineUsers A {@link Record} of online users.
 * @returns The transformed nickChangeInfo.
 */
export function transformNickChangeInfo(rawNickChangeInfo: RawNickChangeInfo, onlineUsers: Record<string, User>): NickChangeInfo {
    return {
        user: onlineUsers[rawNickChangeInfo.session_id],

        oldNickname: rawNickChangeInfo.oldUser,
        newNickname: rawNickChangeInfo.newUser,
    };
}

/**
 * Transforms a {@link RawSysMessage} into a {@link SysMessage}.
 * @param rawSysMessage The rawSysMessage to transform.
 * @param unescapeMessages Whether to unescape messages. True by default.
 * @returns The transformed sysMessage
 */
export function transformSysMessage(rawSysMessage: RawSysMessage, unescapeMessages = true): SysMessage {
    return {
        type: rawSysMessage.type,

        message: unescapeMessages ? decodeHTML(rawSysMessage.message) : rawSysMessage.message,
        isHTML : rawSysMessage.isHtml,
    };
}

/**
 * Normalizes a {@link Command} so it is guaranteed to have every property.
 * @param command The command to normalize.
 * @returns The normalized command.
 */
export function normalizeCommand(command: Command): NormalizedCommand {
    return {
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
        description: command.description || "No description provided.",
        aliases    : command.aliases ?? [],
        handler    : command.handler,
        subcommands: command.subcommands ?? {},
    };
}

/**
 * Better version of {@link String.prototype.trim}.
 * Removes whitespace at the beginning and end of each line and does the same for the entire message.
 * @param message The message to trim.
 * @returns The trimmed message.
 */
export function trimMessage(message: string): string {
    return message
        .split("\n")
        .map( line => line.trim() )
        .join("\n")
        .trim();
}