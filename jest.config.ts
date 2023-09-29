import { JestConfigWithTsJest } from "ts-jest";

const jestConfig: JestConfigWithTsJest = {
    preset                : "ts-jest/presets/default-esm",
    testEnvironment       : "node",
    testMatch             : [ "**/__tests__/**/*.[jt]s?(x)", "**/?(*.)+(spec|test).[tj]s?(x)", "**/test/**/*.[jt]s?(x)" ],
    extensionsToTreatAsEsm: [ ".ts" ],
};

module.exports = jestConfig;