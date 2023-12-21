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
        color      : rawUser.color,
        flags      : rawUser.flags,
        ID         : rawUser.id,
        sessionID  : rawUser.session_id,
        nickname   : rawUser.user,
        escapedName: escapeName(rawUser.user),
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
        handler    : command.handler.bind(command),
        subcommands: command.subcommands ?? {},
        hidden     : command.hidden ?? false,
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

/**
 * Escapes special characters in a nickname.
 * @param name The name to escape.
 * @returns The escaped name.
 */
export function escapeName(name: string): string {
    const replacements: Record<string, string> = {
        // special unicode characters
        "\u202E": "[U+202E]",
        "\u202B": "[U+202B]",
        "\u202A": "[U+202A]",
        "\u200E": "[U+200E]",
        "\u200F": "[U+200F]",
        "\u2066": "[U+2066]",
        "\u2067": "[U+2067]",
        "\u2068": "[U+2068]",
        "\u2069": "[U+2069]",
        "\x00"  : "[U+0000]",
        "\x01"  : "[U+0001]",
        "\x02"  : "[U+0002]",
        "\x03"  : "[U+0003]",
        "\x04"  : "[U+0004]",
        "\x05"  : "[U+0005]",
        "\x06"  : "[U+0006]",
        "\x07"  : "[U+0007]",
        "\x08"  : "[U+0008]",
        "\x09"  : "[U+0009]",
        "\x0A"  : "[U+000A]",
        "\x0B"  : "[U+000B]",
        "\x0C"  : "[U+000C]",
        "\x0D"  : "[U+000D]",
        "\x0E"  : "[U+000E]",
        "\x0F"  : "[U+000F]",
        "\x10"  : "[U+0010]",
        "\x11"  : "[U+0011]",
        "\x12"  : "[U+0012]",
        "\x13"  : "[U+0013]",
        "\x14"  : "[U+0014]",
        "\x15"  : "[U+0015]",
        "\x16"  : "[U+0016]",
        "\x17"  : "[U+0017]",
        "\x18"  : "[U+0018]",
        "\x19"  : "[U+0019]",
        "\x1A"  : "[U+001A]",
        "\x1B"  : "[U+001B]",
        "\x1C"  : "[U+001C]",
        "\x1D"  : "[U+001D]",
        "\x1E"  : "[U+001E]",
        "\x1F"  : "[U+001F]",
        "\x7F"  : "[U+007F]",
        "\u0080": "[U+0080]",
        "\u0081": "[U+0081]",
        "\u0082": "[U+0082]",
        "\u0083": "[U+0083]",
        "\u0084": "[U+0084]",
        "\u0085": "[U+0085]",
        "\u0086": "[U+0086]",
        "\u0087": "[U+0087]",
        "\u0088": "[U+0088]",
        "\u0089": "[U+0089]",
        "\u008A": "[U+008A]",
        "\u008B": "[U+008B]",
        "\u008C": "[U+008C]",
        "\u008D": "[U+008D]",
        "\u008E": "[U+008E]",
        "\u008F": "[U+008F]",
        "\u0090": "[U+0090]",
        "\u0091": "[U+0091]",
        "\u0092": "[U+0092]",
        "\u0093": "[U+0093]",
        "\u0094": "[U+0094]",
        "\u0095": "[U+0095]",
        "\u0096": "[U+0096]",
        "\u0097": "[U+0097]",
        "\u0098": "[U+0098]",
        "\u0099": "[U+0099]",
        "\u009A": "[U+009A]",
        "\u009B": "[U+009B]",
        "\u009C": "[U+009C]",
        "\u009D": "[U+009D]",
        "\u009E": "[U+009E]",
        "\u009F": "[U+009F]",

        // reserved markdown characters
        "\\": "\\\\",
        "[" : "\\[",
        "]" : "\\]",
        "*" : "\\*",
        "_" : "\\_",
    };

    for (const [ character, escapedCharacter ] of Object.entries(replacements)) {
        name = name.replaceAll(character, escapedCharacter);
    }
    
    return name;
}