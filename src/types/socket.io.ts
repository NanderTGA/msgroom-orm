import { Socket } from "socket.io-client";


type MsgroomSocket = Socket<ServerToClientEvents, ClientToServerEvents>;
export default MsgroomSocket;

/**
 * Hexadecimal color string
 * @example "#ff0000"
 */
export type hexColor = string;

export type flag = "staff" | "bot";

interface User {
    color: hexColor;
    flags: flag[];
    id: string;
    session_id: string;
    user: string;
}


// used for receiving events from the server
export interface ServerToClientEvents {
    "auth-complete": (userID: string) => void;
    
    message: (message: {
        color: hexColor;
        content: string;
        date: string;
        id: string;
        session_id: string;
        type: "text";
        user: string
    }) => void;
    
    "sys-message": (message: {
        message: string;
        type: "info" | "error" | "success"
        isHtml: boolean;
    }) => void;
    
    "nick-changed": (args: {
        oldUser: string;
        newUser: string;
        id: string;
        session_id: string;
    }) => void;
    
    "user-join": (args: User) => void;
    
    "user-leave": (args: {
        id: string;
        session_id: string;
        user: string;
    }) => void;
    
    "user-update": (args: {
        type: "tag-add";
        tag?: "staff" | string;
        tagLabel?: string;
        user: string
    }) => void;
    
    online: (members: User[]) => void;
    
    "auth-error": (error: {
        reason: string;
    }) => void;
    
    "werror": (reason: string) => void;
}

// used to send events to the server
export interface ClientToServerEvents {
    "admin-action": (args: {
        args: any;
    }) => void;
    
    message: (args: {
        type: "text";
        content: string;
    }) => void;
    
    "change-user": (newNick: string) => void;
    
    online: () => void;
    
    auth: (args: {
        user: string
    }) => void;
}