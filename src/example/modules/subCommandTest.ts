import type { CommandWithName, ModuleInitializeFunction } from "#types";

const initialize: ModuleInitializeFunction = client => ({
    name       : "subCommandTest",
    description: "hey look at that I can have a description now!",
    handler    : () => "nothing?",
    subcommands: {
        sub1      : { handler: () => "first subcommand" },
        sub2      : { handler: () => "another subcommand" },
        subCommand: {
            description: "This is a subcommand.",
            handler    : () => "Not implemented.",
            subcommands: {
                subSubcommand: {
                    description: "This is a subcommand of a subcommand.",
                    handler    : () => "This is a subcommand of a subcommand.",
                },
                stuff2: {
                    description: "I wonder what this one does.",
                    handler    : () => {
                        throw new Error("Hey, when did this command start throwing errors?");
                    },
                    subcommands: {
                        sub      : { handler: () => "yes subcommand" },
                        testError: client.commands.testError,
                    },
                },
            },
        },
    },
} satisfies CommandWithName);

export default initialize;