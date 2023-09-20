// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

const lightCodeTheme = require("prism-react-renderer/themes/github");
const darkCodeTheme = require("prism-react-renderer/themes/dracula");

const remarkPlugins = [
    [ require("@docusaurus/remark-plugin-npm2yarn"), { sync: true } ],
];

/** @type {import('@docusaurus/types').Config} */
const config = {
    title  : "MsgRoom.js",
    tagline: "A MsgRoom client.",
    favicon: "img/favicon.ico",

    // Set the production url of your site here
    url    : "https://nandertga.github.io",
    // Set the /<baseUrl>/ pathname under which your site is served
    // For GitHub pages deployment, it is often '/<projectName>/'
    baseUrl: "/msgroom-orm",

    // GitHub pages deployment config.
    // If you aren't using GitHub pages, you don't need these.
    organizationName: "NanderTGA", // Usually your GitHub org/user name.
    projectName     : "msgroom", // Usually your repo name.

    onBrokenLinks        : "warn",
    onBrokenMarkdownLinks: "warn",

    // Even if you don't use internalization, you can use this field to set useful
    // metadata like html lang. For example, if your site is Chinese, you may want
    // to replace "en" with "zh-Hans".
    i18n: {
        defaultLocale: "en",
        locales      : [ "en" ],
    },

    plugins: [
        [
            "docusaurus-plugin-typedoc",
            {
                entryPoints: [
                    "../src/index.ts",
                    "../src/errors.ts",
                    "../src/utils/transforms.ts",
                    "../src/utils/testCommand.ts",
                    "../src/types/events.ts",
                    "../src/types/socket.io.ts",
                    "../src/types/types.ts",
                ],
                tsconfig          : "../tsconfig.json",
                entryPointStrategy: "Expand",
                plugin            : [ "typedoc-plugin-rename-defaults" ],
                sidebar           : {
                    position: 2,
                },
            },
        ],
    ],

    presets: [
        [
            "classic",
            /** @type {import('@docusaurus/preset-classic').Options} */
            ({
                docs: {
                    sidebarPath: require.resolve("./sidebars.js"),
                    editUrl    : "https://github.com/NanderTGA/msgroom-orm/tree/main/website/",
                    remarkPlugins,
                },
                blog: {
                    showReadingTime: true,
                    editUrl        : "https://github.com/NanderTGA/msgroom-orm/tree/main/website/",
                    remarkPlugins,
                },
                pages: {
                    remarkPlugins,
                },
                theme: {
                    customCss: require.resolve("./src/css/custom.css"),
                },
            }),
        ],
    ],

    themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
        navbar: {
            title: "MsgRoom.js",
            items: [
                {
                    type     : "docSidebar",
                    sidebarId: "docsSidebar",
                    position : "left",
                    label    : "Docs",
                },
                {
                    to      : "/blog",
                    label   : "Blog",
                    position: "left",
                },
                {
                    href    : "https://github.com/NanderTGA/msgroom-orm",
                    label   : "GitHub",
                    position: "right",
                },
            ],
        },
        footer: {
            style: "dark",
            links: [
                {
                    title: "Docs",
                    items: [
                        {
                            label: "Getting Started",
                            to   : "/docs/intro",
                        },
                    ],
                },
                {
                    title: "Community",
                    items: [
                        {
                            label: "Discord",
                            href : "https://discordapp.com/invite/YRHpTvV",
                        },
                        {
                            label: "MsgRoom",
                            href : "https://msgroom.windows96.net/",
                        },
                    ],
                },
                {
                    title: "More",
                    items: [
                        {
                            label: "Blog",
                            to   : "/blog",
                        },
                        {
                            label: "GitHub",
                            href : "https://github.com/NanderTGA/msgroom-orm",
                        },
                    ],
                },
            ],
            copyright: `Copyright © ${new Date().getFullYear()} NanderTGA and contributors. Built with Docusaurus.`,
        },
        prism: {
            theme    : lightCodeTheme,
            darkTheme: darkCodeTheme,
        },
    }),
};

module.exports = config;