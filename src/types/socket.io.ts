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

export interface RawUser {
    color: hexColor;
    flags: flag[];
    id: string;
    session_id: string;
    user: string;
}

export interface RawMessage {
    color: hexColor;
    content: string;
    date: string;
    id: string;
    session_id: string;
    type: "text";
    user: string;
}

export interface RawNickChangeInfo {
    oldUser: string;
    newUser: string;
    id: string;
    session_id: string;
}

export interface RawUserLeaveInfo {
    id: string;
    session_id: string;
    user: string;
}

export interface RawSysMessage {
    message: string;
    type: "info" | "error" | "success";
    isHtml: boolean;
}

export interface RawUserUpdateInfo {
    /** The session ID of the affected user. */
    user: string;

    type: "tag-add";
    tag?: flag;
    tagLabel?: string;
}

/**
 * used for receiving events from the server
 */
export interface ServerToClientEvents {
    "auth-complete": (userID: string, sessionID: string) => void;
    message: (message: RawMessage) => void;
    "sys-message": (sysMessage: RawSysMessage) => void;
    "nick-changed": (nickChangeInfo: RawNickChangeInfo) => void;
    "user-join": (user: RawUser) => void;
    "user-leave": (userLeaveInfo: RawUserLeaveInfo) => void;
    "user-update": (userUpdateInfo: RawUserUpdateInfo) => void;
    online: (users: RawUser[]) => void;
    "auth-error": (error: {
        /**
         * "there is no auth-error lol" - ctrlz
         */
        reason: string;
    }) => void;
    "werror": (
        /** A generic error, which doesn't cause disconnects. For example ratelimiting errors would send this event. Is currently never called by the server. */
        // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
        reason: string | "You are doing this too much - please wait!"
    ) => void;
}

/**
 * used to send events to the server
 */
export interface ClientToServerEvents {
    "admin-action": (options: {
        /**
         * We currently have no idea what this could be, apart from what the type must be according to the code of the official msgroom client.
         */
        args: string[];
    }) => void;
    
    message: (options: {
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
    
    auth: (options: {
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