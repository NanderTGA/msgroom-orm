import { describe, it, expect } from "@jest/globals";

import { transformUser, transformMessage, transformNickChangeInfo, transformSysMessage } from "../src/utils/transforms";
import { User } from "../src/events";

const someoneUser: User = {
    color    : "#ff0000",
    flags    : [ "staff" ],
    ID       : "some id",
    sessionID: "some session id",
    nickname : "Someone",
};

describe("Test transforms", () => {
    it("User", () => {
        expect(transformUser({
            color     : "#ff0000",
            flags     : [ "staff" ],
            id        : "some id",
            session_id: "some session id",
            user      : "Someone",
        })).toStrictEqual(someoneUser);
    });

    it("Message", () => {
        expect(transformMessage({
            color     : "#ff0000",
            content   : "hi there",
            date      : "Mon, 19 Jun 2023 20:31:37 GMT",
            id        : "some id",
            session_id: "some session id",
            type      : "text",
            user      : "Someone",
        }, [ someoneUser ])).toStrictEqual({
            type   : "text",
            color  : "#ff0000",
            content: "hi there",
            date   : new Date("Mon, 19 Jun 2023 20:31:37 GMT"),
            author : someoneUser,
        });
    });

    it("NickChangeInfo", () => {
        expect(transformNickChangeInfo({
            id        : "some id",
            session_id: "some session id",
            oldUser   : "oldOne",
            newUser   : "Someone",
        }, [ someoneUser ])).toStrictEqual({
            oldNickname: "oldOne",
            newNickname: "Someone",
            user       : someoneUser,
        });
    });

    it("SysMessage", () => {
        expect(transformSysMessage({
            type   : "error",
            message: "hello from system",
            isHtml : false,
        })).toStrictEqual({
            type   : "error",
            message: "hello from system",
            isHTML : false,
        });
    });
});