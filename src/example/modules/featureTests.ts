import type { ModuleInitializeFunction, CommandMap } from "#types";

const initialize: ModuleInitializeFunction = client => ({
    name: {
        description: "Tells you my name or changes it.",
        handler    : (context, ...nameParts) => {
            const newName = nameParts.join(" ");
            if (!newName) return client.name;
            client.name = newName;
        },
    },
    showArguments: {
        description: "Shows the arguments passed to this command.",
        handler    : (context, ...args) => `[ "${args.join(`", "`)}" ]`,
    },
} satisfies CommandMap);

export default initialize;