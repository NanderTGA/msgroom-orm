import { Message, NickChangeInfo, SysMessage, User } from "./socket.io";

type ClientEvents = {
    /** Fired on disconnect. */
    disconnected: () => void;

    /** Fired when a message is received. */
    message: (message: Message) => void;

    /**
     * Fired when a "GUI error" occures.
     * This is can be any error which doesn't disconnect you as a result.
     */
    werror: (reason: string) => void;

    /** Fired when someone changes their nickname. */
    "nick-change": (nickChangeInfo: NickChangeInfo) => void;

    /** Fired when any system message is received */
    "sys-message": (sysMessage: SysMessage) => void;

    /** Fired when a system message is received of type `info` */
    "sys-message-info": (sysMessage: SysMessage & { type: "info" }) => void;

    /** Fired when a system message is received of type `error` */
    "sys-message-error": (sysMessage: SysMessage & { type: "error" }) => void;

    /** Fired when a system message is received of type `success` */
    "sys-message-success": (sysMessage: SysMessage & { type: "success" }) => void;

    /** Fired when a user joins. */
    "user-join": (user: User) => void;

    /** Fired when a user leaves. */
    "user-leave": (user: User) => void;

    /** Fired when a user gets a new tag. */
    "tag-add": (user: User, newTag: string, newTagLabel: string) => void;
};

export default ClientEvents;