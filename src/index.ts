import io from "socket.io-client";
import { EventEmitter } from "node:events";
import MsgroomSocket from "./types/socket.io";

/*export default class Client extends EventEmitter {
    socket: MsgroomSocket;
    
    constructor(public name: string, )
}*/

const socket: MsgroomSocket = io("wss://devel.windows96.net:4096");
socket.emit("online");

socket.on("auth-complete", userID => {
    console.log("socket:", socket);

    socket.emit("message", {
        type   : "text",
        content: "**I figured it out 😁**"
    });
});

socket.emit("auth", {
    user: "testBIGEmoji"
});