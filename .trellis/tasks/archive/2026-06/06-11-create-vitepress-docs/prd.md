# 为本仓库创建VitePress文档系统

## Goal

为本 Monorepo 仓库创建基于 VitePress 的官方文档站，对 `@vyron/cli`、`@vyron/release` 和 `@vyron/storage` 三大模块的所有功能进行详细、美观、直观的介绍，并集成交互式 Playground 供用户免安装在浏览器中直接尝试和体验各包的核心功能。

## Confirmed Facts

- 仓库采用 `pnpm` monorepo 结构，包含三个核心包：
  - `@vyron/cli` (packages/cli): 工具链命令行工具，支持交互式初始化项目、镜像并发测速与管理、一键发布及防呆纠偏。
  - `@vyron/release` (packages/release): 交互式发布流水线，支持 Git/NPM 发布、自动 CHANGELOG、版本回滚、Dry Run。
  - `@vyron/storage` (packages/storage): 多引擎持久化存储管理包，支持 TTL 过期时长、GC 垃圾回收、防篡改签名指纹校验、批量事务、BroadcastChannel 跨实例多键值联动同步。
- 仓库当前尚未安装 VitePress。直接使用根目录 `docs` 文件夹进行集成，并将其配置为 pnpm workspace 子包。

## Requirements

1. **统一文档门户**：使用最新版 VitePress 搭建中英文/中文官方文档网站，主题精美、响应式良好，视觉效果出众（包含渐变色、暗黑模式切换、动画微交互）。
2. **三大模块详尽文档**：
   - **CLI 模块**：详述 `vii init/create`、`vii mirror`、`vii speed/test-mirror`、`vii release` 命令及其参数，包含智能防呆纠偏机制原理。
   - **Release 模块**：详述命令行和 Node.js API 两种调用方式，流程图说明、并发配置 `.releaserc` 及错误回滚逻辑。
   - **Storage 模块**：详述 5 大存储驱动（Memory、Web、Cookie、IndexedDB、Custom）差异及 API 兼容矩阵（同步与异步 API 的冲突拦截等）、TTL 和 GC、防篡改指纹、批量操作与事务回滚、`onChange` 多键订阅。
3. **集成在线 Playground**：
   - **Storage Playground (内置)**：在 VitePress 文档站中直接集成一个交互式 Playground 页面。支持用户在线编辑和运行 JS 代码调用 `@vyron/storage` API，并能实时可视化渲染本地 LocalStorage、SessionStorage、Cookie 和 IndexedDB 的物理变化，支持多标签页状态变化监测。
   - **CLI & Release Playground (外置引导)**：在文档中提供清晰的“在线体验引导”，提供一键创建并跳转至 StackBlitz Webcontainer 容器的按钮/链接，该在线沙盒预装并配置好 `@vyron/cli` 和 `@vyron/release` 环境，让用户能够在真实的浏览器 Node.js 环境中，直接输入 `vii` 命令或运行 Node 脚本体验。

## Acceptance Criteria

- [ ] VitePress 文档服务可通过 `pnpm run docs:dev` 正常在本地启动，界面视觉一流，无排版和构建错误。
- [ ] 拥有清晰的文档结构，cli、release、storage 模块均有各自的文档栏目，核心 API 和命令行命令说明覆盖率达 100%。
- [ ] 成功在文档中嵌入 Storage Playground。
- [ ] Storage Playground 能正确执行用户编写的 API 代码，并直观渲染出底层的 Key-Value 变化与过期状态。
- [ ] 在文档中提供清晰的 CLI & Release 在线体验引导页，包含一键跳转至 StackBlitz 在线沙盒容器的按钮与链接，且该在线沙盒能够开箱即用体验命令。
- [ ] 完整支持响应式、暗黑模式，性能和 SEO 符合最佳实践。

## Out of Scope

- 在 VitePress 页面中直接内嵌并运行复杂的 Node.js Webcontainer 运行时（规避部署端 COOP/COEP 跨域安全头限制与极慢的文档首屏加载问题）。
