import { promisify } from "util";
import type { walk } from "@nodelib/fs.walk";

let walkDirectory: typeof walk.__promisify__;
try {
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    walkDirectory = Function("require", "promisify", `
        // try breaking this, rollup
        const { walk } = require("@nodelib/fs.walk");
        return promisify(walk);
    `)(require, promisify) as typeof walk.__promisify__;
} catch {
    // eslint-disable-next-line @typescript-eslint/require-await
    walkDirectory = async () => {
        throw new Error("This feature is not available in this environment!");
    };
}

//@ts-ignore It will be assigned, don't worry.
export default walkDirectory;