import type Client from ".";
import { Command } from "./types/types";

import { basename } from "path";

const helpCommand = (client: Client) => ({
    description: "Shows information about a command.",
    handler    : async (context, ...args) => {
        const erroredFiles = Array.from(client.erroredFiles).map(file => basename(file)).join(", ");
        if (client.erroredFiles.size > 0) context.send(
            `**An error occurred while loading the following files:** ${erroredFiles}.
**Some features may be unavailable at this time.**
If you are the developer of this bot and need more information, check the console.
We apologize for the inconvenience.`,
        );

        if (args.length < 1) {
            const prefixes: string[] = [];
            let hasRegexPrefix = false;
            for (const value of client.prefixes) {
                let prefix = `\`${value.toString()}\``;
                if (value instanceof RegExp) {
                    hasRegexPrefix = true;
                    prefix += "\\*";
                }
                prefixes.push(prefix);
            }

            const regexMessage = hasRegexPrefix ? "\n\\*Prefixes with an asterisk are regular expressions." : "";

            let output =  `
**The current ${client.prefixes.size > 1 ? "prefixes are" : "prefix is"} ${prefixes.join(", ")} ${regexMessage}
Here's a list of all available commands. For more information on a command, run \`${client.mainPrefix}help <command>\`**
                `;

            const commandList: string[] = [];

            client.walkCommandOrMap(client.commands, (command, fullCommand) => {
                commandList.push(`\n${client.mainPrefix}${fullCommand.join(" ")} - *${command.description}*`);
            });

            output += commandList.sort().join("");
            output = output.trim() + "\n\n" + client.helpSuffix;

            if (output.trim().length > 2048) context.send("Error: output too long\nTODO [#44](https://github.com/NanderTGA/msgroom-orm/issues/44)");

            return output.trim();
        }

        const commandAndArguments = await client.getCommand(args);
        if (!commandAndArguments) return "The command you specified cannot be found.";

        const [ command ] = commandAndArguments;
        const aliases = command.aliases ?? [];

        return  `
**Command:** ${command.name}
**Aliases:** ${aliases.length > 0 ? aliases.join(", ") : "*This command does not have any aliases*"}
**Description:** ${command.description == "No description provided." ? "*No description provided.*" : command.description}
            `.trim();
    },
} satisfies Command);

export default helpCommand;