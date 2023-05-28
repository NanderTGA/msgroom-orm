module.exports = {
    extends: "@nandertga/eslint-config",
    root   : true,
    env    : {
        "browser" : false,
        "commonjs": false,
        "node"    : true,
    },
    parserOptions: {
        sourceType : "module", // for allowing import and export
        ecmaVersion: "latest",
    },
};