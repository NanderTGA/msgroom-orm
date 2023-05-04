import io from "socket.io-client";
import MsgroomSocket, { User } from "./socket.io";

import { EventEmitter } from "node:events";
import TypedEmitter from "typed-emitter";
import ClientEvents from "./events";

import { AuthError, ConnectionError } from "./errors";

export default class Client extends (EventEmitter as unknown as new () => TypedEmitter<ClientEvents>) {
    private socket!: MsgroomSocket;
    #name: string;
    #server: string;
    #users: User[] = [];
    
    constructor(name: string, server = "wss://devel.windows96.net:4096") {
        super();
        this.#name = name;
        this.#server = server;
    }

    async connect(name: string = this.#name, server = this.#server): Promise<string> {
        return new Promise( (resolve, reject) => {
            this.#name = name;
            this.#server = server;

            this.socket = io(this.#server);
            this.socket // no you can't remove this part, that would break the types

            //#region connecting to the server
                .on("connect", () => {
                    this.socket.emit("auth", {
                        user: name,
                    });
                })
                .on("disconnect", () => {
                    this.emit("disconnected");
                })
                .on("connect_error", () => {
                    throw new ConnectionError(`Socket.io connection error. Do the server and client version match? Did you enter the right server details? Is the server running?`);
                })
                .on("auth-complete", userID => {
                    this.socket.emit("online");
                    resolve(userID);
                })
                .on("auth-error", ({ reason }) => {
                    reject(new AuthError(reason));
                })
            //#endregion

            //main events
                .on("online", users => {
                    this.#users = users;
                })
                .on("werror", reason => {
                    this.emit("werror", reason);
                })
                .on("message", message => {
                    this.emit("message", message);
                })
                .on("nick-changed", nickChangeInfo => {
                    const changedUser = this.#users.findIndex( user => user.id == nickChangeInfo.id);
                    if (changedUser == -1) return;

                    //TODO
                });
        });
    }

    get server() {
        return this.#server;
    }

    get name() {
        return this.#name;
    }

    set name(name: string) {
        this.socket.emit("change-user", name);
    }

    get users() {
        return this.#users;
    }

    sendMessage(...messages: string[]): void {
        messages.forEach( message => this.socket.emit("message", {
            type   : "text",
            content: message,
        }));
    }
}

const client = new Client("test");

client.on("connected", userID => {
    client.sendMessage();
});

/*const userID = await client.connect()
client.sendMessage("hi there")*/