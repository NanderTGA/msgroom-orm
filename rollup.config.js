// taken from https://github.com/rudyhuynh/use-interval-time/blob/main/rollup.config.js
// thanks to @rudyhuynh
import typescript from "@rollup/plugin-typescript";
import pkg from "./package.json";

export default [
    // CommonJS (for Node) and ES module (for bundlers) build.
    // require('...') and import {} from '...'
    // (We could have three entries in the configuration array
    // instead of two, but it's quicker to generate multiple
    // builds from a single configuration where possible, using
    // an array for the `output` option, where we can specify
    // `file` and `format` for each target)
    {
        input   : "src/index.ts",
        external: [ "ms" ],
        output  : [
            { file: pkg.main, format: "cjs" },
            { file: pkg.module, format: "es" }
        ],
        plugins: [ typescript({ tsconfig: "./tsconfig.json" }) ]
    }
];