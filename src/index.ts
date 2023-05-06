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

    /**
     * Connect to a msgroom server. This should be the first function you run after creating a new instance of this class.
     * @param name The username you want to use.
     * @param server A URL to the server you want to connect to.
     * @param apikey You can request one from ctrlz.
     * @returns A promise which resolves to your userID.
     */
    async connect(name: string = this.#name, server = this.#server, apikey?: string): Promise<string> {
        return new Promise( (resolve, reject) => {
            this.#name = name;
            this.#server = server;

            let userID: string;

            this.socket = io(this.#server);
            this.socket // no you can't remove this line, that would break the types

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
                .on("auth-complete", authenticatedUserID => {
                    this.socket.emit("online");
                    userID = authenticatedUserID;
                })
                .on("auth-error", ({ reason }) => {
                    reject(new AuthError(reason));
                })
                .on("online", users => {
                    this.#users = users;
                    resolve(userID);
                })
            //#endregion

            //#region main events
                .on("werror", reason => {
                    this.emit("werror", reason);
                })
                .on("message", message => {
                    this.emit("message", message);
                    //TODO commands
                })
                .on("sys-message", sysMessage => {
                    this.emit("sys-message", sysMessage);
                    this.emit(`sys-message-${sysMessage.type}`, sysMessage);
                })
                .on("nick-changed", nickChangeInfo => {
                    const changedUserIndex = this.#users.findIndex( user => {
                        if (!user) return;
                        return user.id == nickChangeInfo.id && nickChangeInfo.session_id == user.id && nickChangeInfo.oldUser == user.user;
                    });
                    if (changedUserIndex == -1) return;

                    this.#users[changedUserIndex].user = nickChangeInfo.newUser;

                    this.emit("nick-change", nickChangeInfo);
                })
                .on("user-join", user => {
                    if (!user) return;
                    this.#users.push(user);
                    this.emit("user-join", user);
                })
                .on("user-leave", userLeaveInfo => {
                    const leftUserIndex = this.#users.findIndex( user => {
                        if (!user) return false;
                        return user.id == userLeaveInfo.id && user.session_id == userLeaveInfo.session_id && user.user == userLeaveInfo.user;
                    });
                    if (leftUserIndex == -1) return;

                    this.emit("user-leave", this.#users[leftUserIndex]);
                    delete this.#users[leftUserIndex];
                })
                .on("user-update", userUpdateInfo => {
                    const updatedUserIndex = this.#users.findIndex( user => {
                        if (!user) return false;
                        return user.session_id == userUpdateInfo.user;
                    });
                    if (updatedUserIndex == -1) return;
                    
                    switch (userUpdateInfo.type) {
                        case "tag-add":
                            if (!userUpdateInfo.tag || !userUpdateInfo.tagLabel) return;
                            if (userUpdateInfo.tag.trim() == "") return;

                            if (this.#users[updatedUserIndex].flags.includes(userUpdateInfo.tag)) this.#users[updatedUserIndex].flags.push(userUpdateInfo.tag);

                            this.emit("tag-add", this.#users[updatedUserIndex], userUpdateInfo.tag, userUpdateInfo.tagLabel);
                    }
                });
            //#endregion
            
            this.socket.emit("auth", {
                user: name,
                apikey,
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
        const message = messages.join("");
        this.socket.emit("message", {
            type   : "text",
            content: message,
        });
    }

    /**
     * We currently have no idea what this could be, apart from what the type must be according to the code of the official msgroom client.
     * @param args The arguments to pass to the `admin-action` event.
     */
    adminAction(...args: string[]): void {
        this.socket.emit("admin-action", { args });
    }
}

/*const client = new Client("test");
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-ignore
const userID = await client.connect();
client.sendMessage("hi there");*/