/**
 * @module
 * This file contains the code for the built-in help command.
 * It is similar to a normal module, but without the name property.
 * It also doesn't support any async stuff outside of the command because it is loaded in the constructor.
 */

import type Client from "#client";
import type { Command } from "#types";

import { basename } from "path";

const helpCommand = (client: Client) => ({
    description: "Shows a list of commands or information about a specific command.",
    handler    : async (context, ...args) => {
        const erroredFiles = Array.from(client.erroredFiles).map(file => basename(file)).join(", ");
        if (client.erroredFiles.size > 0) context.send(
            `**An error occurred while loading the following files:** ${erroredFiles}.
**Some features may be unavailable at this time.**
If you are the developer of this bot and need more information, check the console.
We apologize for the inconvenience.`,
        );

        const commandAndArguments = await client.getCommand(args);
        let pageNumber = parseInt(args[0]);

        if ((!commandAndArguments && pageNumber) || args.length < 1) {
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

            const commandList: string[] = [];
            client.walkCommandOrMap(client.commands, (command, fullCommand) => {
                if (command.hidden) return;
                commandList.push(`\n${client.mainPrefix}${fullCommand.join(" ")} - *${command.description}*`);
            });

            const regexMessage = hasRegexPrefix ? "\n\\*Prefixes with an asterisk are regular expressions." : "";
            
            const helpCommandLimit = parseInt(args[1]) || client.helpCommandLimit;
            if (!pageNumber) pageNumber = 1;
            const pagesAmount = Math.ceil(commandList.length / helpCommandLimit);
            if (pageNumber < 0) pageNumber = pagesAmount + pageNumber + 1;
            if (pageNumber > pagesAmount || pageNumber <= 0) return "That page doesn't exist.";
            const commandListStart = (pageNumber - 1) * helpCommandLimit;
            const commandsToShow = commandList.sort().slice(commandListStart, commandListStart + helpCommandLimit);

            let output =  `
**The current ${client.prefixes.size > 1 ? "prefixes are" : "prefix is"} ${prefixes.join(", ")} ${regexMessage}
Here's a list of all available commands. For more information on a command, run \`${client.mainPrefix}help <command>\`
Showing ${commandsToShow.length} commands on page ${pageNumber}/${pagesAmount} with ${helpCommandLimit} commands per page.**
                `;

            output += commandsToShow.join("");
            output = (output.trim() + "\n\n" + client.helpSuffix).trim();

            return output.length <= 2048 ? output : "Error: The help command output is too long. Please decrease the [help command limit](https://nandertga.github.io/msgroom-orm/docs/api/interfaces/types_types.ClientOptions#helpcommandlimit).";
        }

        if (!commandAndArguments) return "The command you specified cannot be found.";

        const [ command ] = commandAndArguments;
        const aliases = command.aliases ?? [];
        const joinedAliases = aliases.map( alias => Array.isArray(alias)
            ? alias.reduce( (accumulator, currentValue) => {
                if (!currentValue.includes(" ")) return `${accumulator} ${currentValue}`;
                return `${accumulator} "${currentValue}"`;
            }, "")
            : alias,
        );

        return  `
**Command:** ${command.name}
**Aliases:** ${joinedAliases.length > 0 ? joinedAliases.join(", ") : "*This command does not have any aliases*"}
**Description:** ${command.description == "No description provided." ? "*No description provided.*" : command.description}
            `;
    },
} satisfies Command);

export default helpCommand;