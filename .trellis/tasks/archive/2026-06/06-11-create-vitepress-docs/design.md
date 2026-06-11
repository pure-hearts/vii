# Design: 为本仓库创建VitePress文档系统

本文档阐述文档系统的架构设计、核心技术选型以及交互式 Playground 的技术实现方案。

## 架构概览与边界 (Architecture & Boundaries)

文档系统作为一个独立的 pnpm workspace 成员，直接位于项目根目录的 `docs` 下，并以 `@vyron/docs`（或 `docs` 包名）的方式与主项目关联。

```
vii (Monorepo Root)
├── package.json (根配置，管理 workspace 脚本)
├── pnpm-workspace.yaml (追加 "docs" 路径)
├── packages
│   ├── cli/
│   ├── release/
│   └── storage/
└── docs
    ├── package.json (VitePress 依赖，引用本地 @vyron/storage)
    ├── .vitepress
    │   ├── config.mts (导航栏、侧边栏、主题配置)
    │   └── theme
    │       └── index.ts (注册自定义组件与样式)
    ├── index.md (首页)
    ├── guide
    │   ├── cli.md (CLI 模块文档与 StackBlitz 引导)
    │   ├── release.md (Release 模块文档与 StackBlitz 引导)
    │   └── storage.md (Storage 模块文档与内置 Playground 入口)
    └── components
        ├── StoragePlayground.vue (内置的 Storage 交互式沙盒组件)
        └── StackBlitzRedirect.vue (CLI/Release 外置引导跳转组件)
```

## 技术选型与权衡 (Trade-offs)

1. **工作区目录位置**：
   - **决策**：直接使用根目录 `docs`，但在 `pnpm-workspace.yaml` 中追加 `"docs"` 成员。
   - **理由**：既保证了物理目录在根目录下符合文档的常见约定，又能无缝通过 workspace 链接引用 `@vyron/storage` 实时构建的本地产物。
2. **Storage Playground 执行环境**：
   - **设计**：在浏览器沙盒中，使用安全的 `new Function` 动态运行用户输入的 JavaScript。
   - **注入上下文**：在执行时，注入最新的 `@vyron/storage` 包导出的 `createStorage` 等核心 API，以及预设的 `cookie`、`indexeddb` 等插件驱动。
3. **物理存储监视器（Real-time Monitor）**：
   - **实现**：Playground 页面右侧提供一个周期性轮询与联动更新的可视化面板，读取浏览器的 LocalStorage、SessionStorage、Cookie 以及模拟的 IndexedDB 库中的物理 Key-Value。
   - **多标签同步检测**：通过原生 `storage` 事件与 BroadcastChannel，实时更新 Playground 中展示的数据卡片。

## 详细设计 (Detailed Design)

### 1. Monorepo 依赖链接与工作区集成

在 `pnpm-workspace.yaml` 中追加 `docs`：

```yaml
packages:
  - "packages/*"
  - "!packages/ui"
  - "docs"
```

在 `docs/package.json` 中：

```json
{
  "name": "vii-docs",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vitepress dev",
    "build": "vitepress build",
    "preview": "vitepress preview"
  },
  "dependencies": {
    "vitepress": "^1.2.3",
    "vue": "^3.4.0",
    "@vyron/storage": "workspace:*"
  }
}
```

### 2. Storage Playground 交互系统

- **代码编辑器**：为了保证视觉体验同时不引入过于庞大的 Monaco Editor 库（避免首屏包体积过大影响性能），使用一个轻量级的带有行号与基础高亮的代码编辑器（例如使用带有 `contenteditable` 的 Prismjs 或简单的极简 textarea 增强版）。
- **运行引擎**：
  ```javascript
  // 核心执行逻辑
  const runCode = (codeText) => {
    try {
      const fn = new Function('createStorage', 'StorageWrapper', 'CookieStorageDriver', 'IndexedDBStorageDriver', 'MemoryStorageDriver', 'console', `
        return (async () => {
          ${codeText}
        })();
      `);
      // 捕获输出并重定向到控制台卡片
      ...
    } catch (e) {
      // 输出错误
    }
  }
  ```
- **实时监控器 (Real-time Monitor)**：
  - 定时器（500ms）或者在执行代码后，主动读取 `localStorage`、`sessionStorage`、`document.cookie` 的真实内容，筛选符合本 Playground 命名空间（或以特定前缀如 `playground_` 开头）的键值。
  - 对于 `IndexedDB`，我们通过驱动内部暴露出数据库列表或建立专有的监控通道，读取并展示数据库中相应的表条目。
  - 提供 "手动运行 GC" 触发按钮，展现 `@vyron/storage` 在 TTL 超时后被 GC 自动回收的视觉效果。

### 3. CLI & Release StackBlitz 引导系统

- **文档引导页**：
  - 为用户提供一个高颜值的引导跳转卡片，带有 "在 StackBlitz 中打开" 按钮。
  - 跳转链接格式：`https://stackblitz.com/fork/github/vfiee/project-boilerplate?file=README.md`
  - 指引用户在跳转后的 StackBlitz Webcontainer 虚拟终端里：
    1. 运行 `npm i -g @vyron/cli @vyron/release` 安装最新版工具链。
    2. 体验 `vii init test-project`，在 Webcontainer 的 node 终端中选择内置模板并体验并发测速镜像。
    3. 运行 `vii release --dry-run` 体验交互式版本升级、CHANGELOG 自动更新等发布流程。

## 兼容性与运行环境 (Compatibility)

- VitePress 构建产物是静态 HTML + 客户端 JS，在编译构建阶段（SSR）不包含 `window` 等对象，必须使用 VitePress 的 `<ClientOnly>` 组件包裹包含浏览器端存储调用的 Playground 组件，防止打包报错。
