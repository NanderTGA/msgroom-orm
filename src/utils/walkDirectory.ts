import { promisify } from "util";
import type { walk } from "@nodelib/fs.walk";

let walkDirectory: typeof walk.__promisify__;
try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { walk } = require("@nodelib/fs.walk") as typeof import("@nodelib/fs.walk");
    walkDirectory = promisify(walk);
} catch {
    walkDirectory = () => {
        throw new Error("This feature is not available in this environment!");
    };
}

export default walkDirectory;