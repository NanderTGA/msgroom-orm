import { test, it, expect } from "@jest/globals";
import Client from "../src/index";
import getCommandOutput from "../src/utils/testCommand";
import { CommandHandler } from "../src/types/types";

const client = new Client("test", [ "!", "g!" ], "wss://dabestmsgroomserver.com");

it("should correctly set properties", () => {
    expect(client.name).toBe("test");
    expect(client.server).toBe("wss://dabestmsgroomserver.com");

    expect(client.commandPrefixes).toStrictEqual([ "!", "g!" ]);
    expect((new Client("test2", "!")).commandPrefixes).toStrictEqual([ "!" ]);
});

it("should validate nicknames correctly", () => {
    expect( () => client.validateNickname("") ).toThrow(); // < 1 character
    expect( () => client.validateNickname("dfssqdfsdfqdfqfdqdfqdsfqsfd") ).toThrow(); // > 18 characters
    expect( () => client.validateNickname("dfssqdfsdfqdfqfdqdg") ).toThrow(); // > 18 characters
    client.validateNickname("dfssqdfsdfqdfqfdqd"); // 18 characters
});

test("built-in help command", async () => {
    const helpOutput = await getCommandOutput(client, "help", client.commands.help as CommandHandler);
    expect(helpOutput).toStrictEqual([ "**List of available commands:** help" ]); // assuming no other commands are defined
});