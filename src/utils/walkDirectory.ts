import { promisify } from "util";
import type { walk } from "@nodelib/fs.walk";

const isNode = typeof process != "undefined" && typeof process.versions?.node == "string";

let walkDirectory: typeof walk.__promisify__;
if (isNode) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { walk } = require("@nodelib/fs.walk") as typeof import("@nodelib/fs.walk");
    walkDirectory = promisify(walk);
} else {
    // eslint-disable-next-line @typescript-eslint/require-await
    walkDirectory = async () => {
        throw new Error("This feature is not available in this environment!");
    };
}

export default walkDirectory;