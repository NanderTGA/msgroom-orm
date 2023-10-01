import { promisify } from "util";
import type { walk } from "@nodelib/fs.walk";

export let walkDirectory: typeof walk.__promisify__;
try {
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    walkDirectory = await Function("promisify", /*javascript*/ `
    return (async function () {
        // try breaking this, rollup
        const { walk } = await import("@nodelib/fs.walk");
        return promisify(walk);
    })()
    `)(promisify) as typeof walk.__promisify__;
} catch (error) {
    // eslint-disable-next-line @typescript-eslint/require-await
    walkDirectory = async () => {
        throw new Error("This feature is not available in this environment!", { cause: error });
    };
}

// get the real dynamic import() function, because the typescript compiler will override it to use require() >:(
// eslint-disable-next-line @typescript-eslint/no-implied-eval
export const dynamicImport = Function("importSpecifier", /*javascript*/ `
    return import(importSpecifier);
`) as <T>(importSpecifier: string) => Promise<T>;