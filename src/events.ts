import { Message } from "./socket.io";

type ClientEvents = {
    disconnected: () => void;
    connected: (userID: string) => void;
    message: (message: Message) => void;
    werror: (reason: string) => void;
};

export default ClientEvents;