import { defineConfig } from "vitepress";

export default defineConfig({
  title: "VII Toolchain",
  description: "VII 前端与工具链工程化解决方案官方文档",
  lang: "zh-CN",
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
    socialLinks: [{ icon: "github", link: "https://github.com/vfiee/project-boilerplate" }],
    footer: {
      message: "基于 MIT 协议开源",
      copyright: "Copyright © 2026-present vyron",
    },
  },
});
