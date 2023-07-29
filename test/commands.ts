import { test, it, expect } from "@jest/globals";
import Client from "../src/index";
import getCommandOutput from "../src/utils/testCommand";


const client = new Client("test", [ "!", "g!" ], { server: "wss://dabestmsgroomserver.com" });

client.commands.something = {
    description: "does some things",
    aliases    : [ [ "stuff" ] ],
    handler    : () => "ok I did some stuff",
};
client.commands.throwError = {
    description: "does exactly what you think it does",
    aliases    : [ [ "inYourFace" ] ],
    handler    : () => {
        throw new Error("fuck");
    },
};

it("should correctly set properties", () => {
    expect(client.name).toBe("test");
    expect(client.server).toBe("wss://dabestmsgroomserver.com");

    expect(Array.from(client.prefixes)).toStrictEqual([ "!", "g!" ]);
    expect(Array.from((new Client("test2", "!")).prefixes)).toStrictEqual([ "!" ]);
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

/**
 * To anyone writing more tests for built-in commands like this,
 * Please test a commands's *behavior*, not if the output matches exactly what you wrote.
 *
 * For example: the help command might change in future.
 * This should not mean you'd have to rewrite these tests.
 * The command should fullfil its purpose, which is telling the user what commands there are.
 *
 * This is what the tests should test for.
 * The help command should process all data (command names, descriptions, subcommands), and display it in some way.
 * The tests should not define in *what way* it does this, they should only check if the expected data is there.
 *
 * This also applies to the test above involving error handling.
 */

test("built-in help command should list all commands and their descriptions", async () => {
    const helpOutput = await getCommandOutput(client, "!help");
    
    expect(helpOutput).toContain("help");
    expect(helpOutput).toContain("g!");
    expect(helpOutput).toContain("!");

    expect(helpOutput).toContain("something");
    expect(helpOutput).toContain("does some things");
    
    expect(helpOutput).toContain("throwError");
    expect(helpOutput).toContain("does exactly what you think it does");
});

test("built-in help command should list specific commands and their descriptions", async () => {
    const helpOutput = await getCommandOutput(client, "!help something");
    
    expect(helpOutput).toContain("something");
    expect(helpOutput).toContain("does some things");
    expect(helpOutput).toContain("stuff");
});