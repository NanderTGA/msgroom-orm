import { describe, it, expect } from "@jest/globals";
import Client from "../src/index";

const client = new Client("test", [ "!", "g!" ], "wss://dabestmsgroomserver.com");

it("should correctly set properties", () => {
    expect(client.name).toBe("test");
    expect(client.server).toBe("wss://dabestmsgroomserver.com");

    expect(client.commandPrefixes).toStrictEqual([ "!", "g!" ]);
    expect((new Client("test2", "!")).commandPrefixes).toStrictEqual([ "!" ]);
});

it("should validate nicknames correctly", () => {
    expect( () => client.validateNickname("") ).toThrow();
    expect( () => client.validateNickname("dfssqdfsdfqdfqfdqdfqdsfqsfd") ).toThrow();
    expect( () => client.validateNickname("dfssqdfsdfqdfqfdqdg") ).toThrow();
    client.validateNickname("dfssqdfsdfqdfqfdqd");
});