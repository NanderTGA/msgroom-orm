import Client from "../..";
import { ModuleInitializeFunctionReturnType } from "../../types/types";

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