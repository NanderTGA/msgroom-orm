import { resolve } from "path";
import { defineConfig } from "vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";

export default defineConfig({
    build: {
        lib: {
            entry: [
                "src/index.ts",
                "src/errors.ts",
                "src/utils/testCommand.ts",
                "src/types/types.ts",
                "src/types/events.ts",
            ].map( entry => resolve(__dirname, entry)),
            name    : "Msgroom",
            fileName: (format, entryName) => `${entryName}.${format}.js`,
        },
        sourcemap: true,
        outDir   : "dist/browser",
    },
    plugins: [
        nodePolyfills({
            overrides: {
                fs: "memfs",
            },
        }),
    ],
});