import Client from "../..";
import { ModuleInitializeFunctionReturnType } from "../../types/types";
import Command from "../../utils/Command";

export default function(client: Client): ModuleInitializeFunctionReturnType {
    return {
        weirdSubCommandMess: {
            undefined: {
                undefined: new Command("undefined undefined", [], () => "undefined undefined"),
                a        : new Command("a.", [], () => "a."),
            },
        },
    };
}