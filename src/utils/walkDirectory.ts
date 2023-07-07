import { promisify } from "util";
import type { walk } from "@nodelib/fs.walk";

let walkDirectory: typeof walk.__promisify__;
try {
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    Function(`
        // try breaking this, rollup
        const { walk } = require("@nodelib/fs.walk");
        walkDirectory = promisify(walk);
    `)();
} catch {
    // eslint-disable-next-line @typescript-eslint/require-await
    walkDirectory = async () => {
        throw new Error("This feature is not available in this environment!");
    };
}

//@ts-ignore It will be assigned, don't worry.
export default walkDirectory;