import { User } from "../types/events";

export default function getUser(onlineUsers: User[], sessionID: string): User {
    return onlineUsers.find( user => user.sessionID == sessionID) || {
        color    : "#ff0000",
        flags    : [],
        ID       : "unknown ID",
        sessionID: "unknown session ID",
        nickname : "unknown user",
    };
}