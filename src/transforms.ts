import { User } from "./events";
import { RawUser } from "./socket.io";

export function transformUser(rawUser: RawUser): User {
    return {
        color    : rawUser.color,
        flags    : rawUser.flags,
        ID       : rawUser.id,
        sessionID: rawUser.session_id,
        nickname : rawUser.user,
    };
}
