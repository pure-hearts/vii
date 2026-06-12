# VitePress Docs Writing Guide

## Goal

补充并完善 VitePress 官方文档集成与编写指南，使其他开发者在后续维护、新增模块时，能够清晰了解：

1. 如何开发和集成浏览器端交互组件（Playground）。
2. 如何组织和配置中英文双语国际化（I18n）文档结构。
3. 如何配置和书写正确的 StackBlitz 在线运行链接及底层 WebContainer 启动脚本。

## Confirmed Facts

1. 本项目文档系统使用 **VitePress** 作为底层，位于根目录的 `docs/` 下。
2. 文档已经配置了中英文双语国际化（I18n）支持：
   - 中文文档源文件位于 `docs/guide/`
   - 英文文档源文件位于 `docs/en/guide/`
   - 配置由 `docs/.vitepress/config.mts` 驱动。
3. 交互式组件（如 `<StoragePlayground />`）使用了 `vue`，因为涉及浏览器特有对象（如 `localStorage`, `window` 等），在 VitePress 构建时会导致 SSR 报错。
4. 目前已实现了通过根目录 `.stackblitzrc` 与 `package.json` 中的 `stackblitz:*` 指令一键启动并自动配置不同包的 StackBlitz 在线试用环境。
5. 现有的文档开发规范记录于 [.trellis/spec/guides/docs-integration-guide.md](file:///Users/vyron/Mine/vii/.trellis/spec/guides/docs-integration-guide.md)，但它只包含“目录结构”和“SSR安全隔绝”两点，**缺失了关于“I18n多语言配置”与“StackBlitz试用环境配置及按钮书写规范”的内容**。

## Requirements

- 在 [.trellis/spec/guides/docs-integration-guide.md](file:///Users/vyron/Mine/vii/.trellis/spec/guides/docs-integration-guide.md) 中扩充以下规则：
  - **I18n 规范**：明晰新建文件时需要在 `docs/guide/{name}.md` 与 `docs/en/guide/{name}.md` 双向配对，并在 `config.mts` 的 `locales` 中声明侧边栏。
  - **StackBlitz 规范**：明晰当开发了新包或有新演示需求时，必须在根目录中配置对应的 `stackblitz:xxx` 运行脚本；且在 markdown 中按钮链接的生成逻辑（携带 `file` 与 `startScript` 查询参数以实现免手动配置直达运行）。
  - **Playground 开发原则**：保留关于使用 `<ClientOnly>` 以及动态 `new Function` 执行沙盒代码的说明。

## Acceptance Criteria

- [ ] 更新后的 [docs-integration-guide.md](file:///Users/vyron/Mine/vii/.trellis/spec/guides/docs-integration-guide.md) 详细涵盖：
  - 多语言 I18n 结构配对与路由配置规范。
  - StackBlitz 在线尝试按钮的 URL 参数规范与对应的 package.json 初始化脚本定义规则。
- [ ] 规范文档通过 `pnpm lint` 的格式与质量检查。

## Out of Scope

- 对 VitePress 站点本身的代码进行修改。
- 重构已有的中英文档文件或 Playground 代码。
