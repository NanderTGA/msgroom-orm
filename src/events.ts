import { RawMessage, RawNickChangeInfo, RawSysMessage, flag, hexColor } from "./socket.io";

export interface User {
    color: hexColor;
    flags: flag[];
    ID: string;
    sessionID: string;
    nickname: string;
}

type ClientEvents = {
    /** Fired on disconnect. */
    disconnected: () => void;

    /** Fired when a message is received. */
    message: (message: RawMessage) => void;

    /**
     * Fired when a "GUI error" occures.
     * This is can be any error which doesn't disconnect you as a result.
     * Currently never called by the official server.
     */
    werror: (reason: string | "message too long") => void;

    /** Fired when someone changes their nickname. */
    "nick-change": (nickChangeInfo: RawNickChangeInfo) => void;

    /** Fired when any system message is received */
    "sys-message": (sysMessage: RawSysMessage) => void;

    /** Fired when a system message is received of type `info` */
    "sys-message-info": (sysMessage: RawSysMessage & { type: "info" }) => void;

    /** Fired when a system message is received of type `error` */
    "sys-message-error": (sysMessage: RawSysMessage & { type: "error" }) => void;

    /** Fired when a system message is received of type `success` */
    "sys-message-success": (sysMessage: RawSysMessage & { type: "success" }) => void;

    /** Fired when a user joins. */
    "user-join": (user: User) => void;

    /** Fired when a user leaves. */
    "user-leave": (user: User) => void;

    /** Fired when a user gets a new tag. */
    "tag-add": (user: User, newTag: string, newTagLabel: string) => void;
};

export default ClientEvents;