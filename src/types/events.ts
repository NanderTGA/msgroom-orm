import type { Flag } from "#types/socket.io.js";
export { Flag };

export interface User {
    /** A css color. */
    color: string;
    flags: Flag[];
    ID: string;
    sessionID: string;
    nickname: string;
    escapedName: string;
}

export interface Message {
    type: "text";

    /** A css color. */
    color: string;
    content: string;
    date: Date;
    author: User;

    bridged?: {
        originalMessage: Message;
        socialMediaApp: string;
        socialMediaUser: {
            name: string;
            ID: string;
        };
    };
}

export interface NickChangeInfo {
    user: User;
    oldNickname: string;
    newNickname: string;
}

type SysMessageType = "info" | "error" | "success";

export interface SysMessage<Type extends SysMessageType = "info" | "error" | "success"> {
    type: Type;
    message: string;
    isHTML: boolean;
}

export interface TagAddInfo {
    user: User;
    newTag: string;
    newTagLabel: string;
}

/**
 * @interface
 */
type ClientEvents = { // eslint-disable-line @typescript-eslint/consistent-type-definitions
    /** Fired on disconnect. */
    disconnected: () => void;

    /** Fired when a message is received. */
    message: (message: Message) => void;

    /**
     * Fired when a "GUI error" occurs.
     * This is can be any error which doesn't disconnect you as a result.
     */
    // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
    werror: (reason: string | "message too long" | "You are doing this too much - please wait!") => void;

    /** Fired when someone changes their nickname. */
    "nick-change": (nickChangeInfo: NickChangeInfo) => void;

    /** Fired when any system message is received */
    "sys-message": (sysMessage: SysMessage) => void;

    /** Fired when a system message is received of type `info` */
    "sys-message-info": (sysMessage: SysMessage<"info">) => void;

    /** Fired when a system message is received of type `error` */
    "sys-message-error": (sysMessage: SysMessage<"error">) => void;

    /** Fired when a system message is received of type `success` */
    "sys-message-success": (sysMessage: SysMessage<"success">) => void;

    /** Fired when a user joins. */
    "user-join": (user: User) => void;

    /** Fired when a user leaves. */
    "user-leave": (user: User) => void;

    /** Fired when a user gets a new tag. */
    "tag-add": (tagAddInfo: TagAddInfo) => void;
};

export default ClientEvents;