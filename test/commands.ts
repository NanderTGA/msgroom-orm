import { test, it, expect } from "@jest/globals";
import Client from "../src/index";
import getCommandOutput from "../src/utils/testCommand";


const client = new Client("test", [ "!", "g!" ], { server: "wss://dabestmsgroomserver.com" });

client.commands.something = {
    description: "does stuff",
    aliases    : [ "stuff" ],
    handler    : () => "ok I did some stuff",
};
client.commands.throwError = {
    description: "does exactly what you think it does",
    aliases    : [ "inYourFace" ],
    handler    : () => {
        throw new Error("fuck");
    },
};

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

test("getCommandOutput should return output of command", async () => {
    const somethingOutput = await getCommandOutput(client, "!something");
    expect(somethingOutput).toBe("ok I did some stuff");
});

it("should handle errors in command handlers correctly", async () => {
    const throwErrorOutput = await getCommandOutput(client, "!throwError");

    expect(throwErrorOutput).toContain("throwError");
    expect(throwErrorOutput).toContain("Error");
    expect(throwErrorOutput).toContain("fuck");
});

test("built-in help command should list all commands and their descriptions", async () => {
    const helpOutput = await getCommandOutput(client, "!help");
    
    expect(helpOutput).toContain("help");

    expect(helpOutput).toContain("something");
    expect(helpOutput).toContain("does stuff");
    
    expect(helpOutput).toContain("throwError");
    expect(helpOutput).toContain("does exactly what you think it does");
});

test("built-in help command should list specific commands and their descriptions", async () => {
    const helpOutput = await getCommandOutput(client, "!help something");
    
    expect(helpOutput).toContain("something");
    expect(helpOutput).toContain("does stuff");
    expect(helpOutput).toContain("something");
});