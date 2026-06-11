import { defineConfig } from "vitepress";

export default defineConfig({
  title: "VII Toolchain",
  description: "VII 前端与工具链工程化解决方案官方文档 / VII Front-end Toolchain Solution Docs",

  locales: {
    root: {
      label: "简体中文",
      lang: "zh-CN",
      description: "VII 前端与工具链工程化解决方案官方文档",
      themeConfig: {
        nav: [
          { text: "介绍", link: "/guide/introduction" },
          { text: "CLI 工具", link: "/guide/cli" },
          { text: "Release 流水线", link: "/guide/release" },
          { text: "Storage 存储", link: "/guide/storage" },
        ],
        sidebar: {
          "/": [
            {
              text: "入门指南",
              items: [
                { text: "什么是 VII", link: "/guide/introduction" },
                { text: "快速开始", link: "/guide/quick-start" },
              ],
            },
            {
              text: "核心包参考",
              items: [
                { text: "CLI 命令行工具", link: "/guide/cli" },
                { text: "Release 发布流水线", link: "/guide/release" },
                { text: "Storage 存储管理器", link: "/guide/storage" },
              ],
            },
          ],
        },
      },
    },
    en: {
      label: "English",
      lang: "en-US",
      link: "/en/",
      description:
        "Official documentation for VII frontend engineering toolchain and multi-engine storage solution",
      themeConfig: {
        nav: [
          { text: "Introduction", link: "/en/guide/introduction" },
          { text: "CLI Tool", link: "/en/guide/cli" },
          { text: "Release Pipeline", link: "/en/guide/release" },
          { text: "Storage", link: "/en/guide/storage" },
        ],
        sidebar: {
          "/en/": [
            {
              text: "Getting Started",
              items: [
                { text: "What is VII?", link: "/en/guide/introduction" },
                { text: "Quick Start", link: "/en/guide/quick-start" },
              ],
            },
            {
              text: "Core Packages Reference",
              items: [
                { text: "CLI Command Line Tool", link: "/en/guide/cli" },
                { text: "Release Pipeline", link: "/en/guide/release" },
                { text: "Storage Manager", link: "/en/guide/storage" },
              ],
            },
          ],
        },
      },
    },
  },

  themeConfig: {
    socialLinks: [{ icon: "github", link: "https://github.com/vfiee/project-boilerplate" }],
    footer: {
      message: "基于 MIT 协议开源 / Released under the MIT License.",
      copyright: "Copyright © 2026-present vyron",
    },
  },
});
