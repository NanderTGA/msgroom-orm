import type Client from "#client";
import type { ModuleInitializeFunctionReturnType } from "#types";

export default function(client: Client): ModuleInitializeFunctionReturnType {
    return {
        name       : "test",
        description: "some test command",
        aliases    : [
            [ "tset" ],
        ],
        handler: () => "test",
    };
}