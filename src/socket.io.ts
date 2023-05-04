import { Socket } from "socket.io-client";
import { EventNames } from "@socket.io/component-emitter";

type MsgroomSocket = Socket<ServerToClientEvents, ClientToServerEvents>;
export default MsgroomSocket;

type ReservedEventNames = "connect" | "connect_error" | "disconnect";
export type ServerToClientEventNames = EventNames<ServerToClientEvents> | ReservedEventNames;
export type ClientToServerEventNames = EventNames<ClientToServerEvents>;

/**
 * Hexadecimal color string
 * @example "#ff0000"
 */
export type hexColor = `#${string}`;

export type flag = "staff" | "bot";

export interface User {
    color: hexColor;
    flags: flag[];
    id: string;
    session_id: string;
    user: string;
}

export type Message = {
    color: hexColor;
    content: string;
    date: string;
    id: string;
    session_id: string;
    type: "text";
    user: string;
};

export type NickChangeInfo = {
    oldUser: string;
    newUser: string;
    id: string;
    session_id: string;
};

export type UserLeaveInfo = {
    id: string;
    session_id: string;
    user: string;
};

export type SysMessage = {
    message: string;
    type: "info" | "error" | "success";
    isHtml: boolean;
};

export type UserUpdateInfo = {
    type: "tag-add";
    tag?: "staff" | string;
    tagLabel?: string;
    user: string;
};

/**
 * used for receiving events from the server
 */
export interface ServerToClientEvents {
    "auth-complete": (userID: string) => void;
    message: (message: Message) => void;
    "sys-message": (sysMessage: SysMessage) => void;
    "nick-changed": (nickChangeInfo: NickChangeInfo) => void;
    "user-join": (args: User) => void;
    "user-leave": (userLeaveInfo: UserLeaveInfo) => void;
    "user-update": (userUpdateInfo: UserUpdateInfo) => void;
    online: (users: User[]) => void;
    "auth-error": (error: {
        reason: string;
    }) => void;
    "werror": (/** A generic error, which doesn't cause disconnects. For example ratelimiting errors would send this event. */ reason: string) => void;
}

/**
 * used to send events to the server
 */
export interface ClientToServerEvents {
    "admin-action": (args: {
        /**
         * We currently have no idea what this could be, apart from what the type must be according to the code of the official msgroom client.
         */
        args: string[];
    }) => void;
    
    message: (args: {
        /**
         * The type of message, so far I know only text is supported right now.
         */
        type: "text";
        /**
         * The text message you want to send.
         */
        content: string;
    }) => void;
    
    "change-user": (/** The new nickname you want. */newNick: string) => void;
    
    online: () => void;
    
    auth: (args: {
        /**
         * The username you want to use.
         */
        user: string;
        /**
         * You can request one from ctrlz
         */
        apikey?: string;
    }) => void;
}