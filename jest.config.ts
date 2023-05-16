import { JestConfigWithTsJest } from "ts-jest";

const jestConfig: JestConfigWithTsJest = {
    preset         : "ts-jest",
    testEnvironment: "node",
    testMatch      : [ "**/__tests__/**/*.[jt]s?(x)", "**/?(*.)+(spec|test).[tj]s?(x)", "**/test/**/*.[jt]s?(x)" ],
};

module.exports = jestConfig;