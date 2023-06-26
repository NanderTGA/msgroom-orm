import Client from "../..";
import { ModuleInitializeFunctionReturnType } from "../../types/types";
import Command from "../../utils/Command";

export default function(client: Client): ModuleInitializeFunctionReturnType {
    return {
        test: new Command("", [], () => "test"),
    };
}