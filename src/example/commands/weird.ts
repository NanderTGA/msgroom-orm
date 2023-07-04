import Client from "../..";
import { ModuleInitializeFunctionReturnType } from "../../types/types";

export default function(client: Client): ModuleInitializeFunctionReturnType {
    return {
        weirdSubCommandMess: {
            undefined: {
                undefined: {
                    description: "undefined undefined",
                    handler    : () => "undefined undefined",
                },
                a: {
                    description: "a.",
                    handler    : () => "a.",
                },
            },
        },
    };
}