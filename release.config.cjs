/**
 * @type {import('semantic-release').GlobalConfig}
 */
module.exports = {
    branches: [
        {
            name   : "main",
            channel: false,
        },
    ],
    plugins: [
        [
            "@semantic-release/commit-analyzer",
            {
                preset      : "conventionalcommits",
                presetConfig: {
                    types: [
                        { type: "fix", section: "Bug Fixes" },
                        { type: "feat", section: "Features" },
                        { type: "chore", hidden: true },
                        { type: "docs", hidden: true },
                        { type: "style", hidden: true },
                        { type: "refactor", hidden: true },
                        { type: "perf", section: "Performance Improvements" },
                        { type: "test", hidden: true },
                        { type: "build", hidden: true },
                        { type: "ci", hidden: true },
                        { type: "revert", hidden: true },
                    ],
                },
            },
        ],
        "@semantic-release/release-notes-generator",
        "@semantic-release/npm",
        "@semantic-release/github",
        [
            "@semantic-release/git",
            {
                assets: [ "package.json", "package-lock.json" ],
            },
        ],
    ],
};