import io from "socket.io-client";
import { EventEmitter } from "node:events";
import MsgroomSocket from "./types/socket.io";
import axios from "axios";

export default class Client extends EventEmitter {
    socket: MsgroomSocket;
    #name: string;
    #server: string;
    
    constructor(name: string, server = "wss://devel.windows96.net:4096") {
        super();
        this.#name = name;
        this.#server = server;

        this.socket = io(server);
        this.socket
            .on("connect", () => {
                this.socket.emit("auth", {
                    user: name
                });
            })
            .on("disconnect", () => {
                this.emit("disconnected");
            })
            .on("connect_error", () => {
                axios.get(`${server}/socket.io/socket.io.js`).then(res => {
                    const serverVersion = res.data.split("\n")[1].split(" ")[3];
                    const clientVersion = require("package.json").dependencies["socket.io-client"];
                    throw new Error(`Socket.io connection error. Do the server and client version match? Did you enter the right server details? Is the server running?\nServer version: ${serverVersion}\nClient version: ${clientVersion}`);
                });
            })
            .on("auth-complete", userID => {
                this.socket.emit("online");
                this.emit("connected", userID);
            });
    }

    get server() {
        return this.#server;
    }

    set server(server: string) {
        this.socket.disconnect();
        this.socket = io(server);
        this.#server = server;
    }
}

/*const socket: MsgroomSocket = io("wss://devel.windows96.net:4096");
socket.emit("online");

socket.on("auth-complete", userID => {
    console.log("socket:", socket);

    socket.emit("message", {
        type   : "text",
        content: "**I figured it out 😁**" // for giant emoji, make it bold or cursive
    });
});

socket.emit("auth", {
    user: "testBIGEmoji"
});*/
axios.get(`wss://devel.windows96.net:4096/socket.io/socket.io.js`.replace("wss://", "https://")).then(res => {
                    const serverVersion = res.data.split("\n")[1].split(" ")[3];
                    const clientVersion = require("../package.json").dependencies["socket.io-client"];
                    throw new Error(`Socket.io connection error. Do the server and client version match? Did you enter the right server details? Is the server running?\nServer version: ${serverVersion}\nClient version: ${clientVersion}`);
                });