import { Message, NickChangeInfo } from "./socket.io";

type ClientEvents = {
    disconnected: () => void;
    message: (message: Message) => void;
    werror: (reason: string) => void;
    "nick-change": (nickChangeInfo: NickChangeInfo) => void;
};

export default ClientEvents;