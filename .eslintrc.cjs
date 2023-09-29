module.exports = {
    extends: "@nandertga/eslint-config",
    root   : true,
    env    : {
        "browser" : false,
        "commonjs": false,
        "node"    : true,
    },
    parserOptions: {
        sourceType     : "module", // for allowing import and export
        ecmaVersion    : "latest",
        project        : "./tsconfig.eslint.json",
        tsconfigRootDir: __dirname,
    },
    ignorePatterns: [
        "node_modules",
        "**/node_modules/**",
        "dist",
        "**/dist/**",
        "coverage",
        "**/coverage/**",
        ".DS_Store",
        "**/.DS_Store/**",
        "website/.docusaurus/**",
        "website/build/**",
    ],
};