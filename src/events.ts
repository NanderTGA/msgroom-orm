import { Message, NickChangeInfo, SysMessage } from "./socket.io";

type ClientEvents = {
    disconnected: () => void;
    message: (message: Message) => void;
    werror: (reason: string) => void;
    "nick-change": (nickChangeInfo: NickChangeInfo) => void;
    "sys-message": (sysMessage: SysMessage) => void;
    "sys-message-info": (sysMessage: SysMessage) => void;
    "sys-message-error": (sysMessage: SysMessage) => void;
    "sys-message-success": (sysMessage: SysMessage) => void;
};

export default ClientEvents;