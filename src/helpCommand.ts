import type Client from ".";
import { Command } from "./types/types";

import { basename } from "path";

const helpCommand = (client: Client) => ({
    description: "Shows information about a command.",
    handler    : (context, ...args) => {
        const erroredFiles = Array.from(client.erroredFiles).map(file => basename(file)).join(", ");
        context.send(
            `**An error occurred while loading the following files:** ${erroredFiles}.
**Some features may be unavailable at this time.**
If you are the developer of this bot and need more information, check the console.
We apologize for the inconvenience.`,
        );

        if (args.length < 1) {
            let output =  `
**The current ${client.prefixes.size > 1 ? "prefixes are" : "prefix is"} \`${Array.from(client.prefixes).join("`, `")}\`
Here's a list of all available commands. For more information on a command, run \`${client.mainPrefix}help <command>\`**
                `;

            const commandList: string[] = [];

            client.walkCommandMapEntry(client.commands, ({ command, commandMap }, name, fullCommand) => {
                if (command && name == "undefined") return;
                if (commandMap && !name) return;
                
                let description: string;
                if (command) description = command.description;
                else if (commandMap) { //TODO #43
                    const subUndefinedDescription = commandMap.undefined?.description;
                    if (typeof subUndefinedDescription == "string") description = subUndefinedDescription;
                    else description = "No description provided.";
                } else description = "No description provided.";

                commandList.push(`\n${client.mainPrefix}${fullCommand.join(" ")} - *${description}*`);
            });

            output += commandList.sort().join("");
            output = output.trim() + "\n\n" + client.helpSuffix;

            if (output.trim().length > 2048) context.send("Error: output too long\nTODO [#44](https://github.com/NanderTGA/msgroom-orm/issues/44)");

            return output.trim();
        }

        const commandName = args[0];
        args.splice(0, 1);

        const commandAndArguments = client.getCommand(commandName, args);
        if (!commandAndArguments) return "The command you specified cannot be found.";

        const [ command ] = commandAndArguments;
        const aliases = command.aliases || [];

        return  `
**Command:** ${command.name}
**Aliases:** ${aliases.length > 0 ? aliases.join(", ") : "*This command does not have any aliases*"}
**Description:** ${command.description || "*No description provided.*"}
            `.trim();
    },
} satisfies Command);

export default helpCommand;