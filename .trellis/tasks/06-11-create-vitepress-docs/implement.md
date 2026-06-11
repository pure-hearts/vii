# Implementation: 为本仓库创建VitePress文档系统

本执行计划包含环境初始化、框架配置、文档撰写、Playground 组件开发、打包验证的完整步骤。

## 执行步骤清单 (Ordered Checklist)

### 1. 环境初始化与 Workspace 联动

- [ ] 修改项目根目录的 [pnpm-workspace.yaml](file:///Users/vyron/Mine/vii/pnpm-workspace.yaml)，追加 `"docs"` 成员。
- [ ] 创建 `docs` 目录，并在其中创建 [package.json](file:///Users/vyron/Mine/vii/docs/package.json)：
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
- [ ] 在仓库根目录执行 `pnpm install` 安装 VitePress 并建立对本地包的软链接。

### 2. VitePress 基础配置

- [ ] 创建 `docs/.vitepress/config.mts`，配置：
  - 站点主标题（如 `"VII Toolchain"`）与副标题描述
  - 多语言/中文包文档的顶部 Nav 导航与 Sidebar 侧边栏（按 cli、release、storage 分类）
- [ ] 创建 `docs/.vitepress/theme/index.ts`，扩展 VitePress 默认主题，支持加载全局 CSS 及自定义组件。
- [ ] 创建 `docs/index.md` 主页，采用华丽的 VitePress 默认 Hero 引导页样式。

### 3. 开发文档章节

- [ ] **CLI 模块文档** (`docs/guide/cli.md`)：
  - 详述安装、免安装运行、`vii init` / `vii speed` / `vii mirror` / `vii release` 所有命令与参数。
  - 辅以 mermaid 流程图展示测速与克隆下载机制。
  - 介绍编辑距离纠偏模糊匹配机制。
  - 提供 StackBlitz 引导与一键打开跳转链接。
- [ ] **Release 模块文档** (`docs/guide/release.md`)：
  - 详述交互式发布命令行、Node.js 编程式 API 选项参数。
  - 详述 `.releaserc.json` 的并行发布、CHANGELOG 覆盖、GitHub Release 等配置。
  - 辅以流程图和自动回滚错误处理策略介绍。
  - 提供 StackBlitz 引导与一键打开链接。
- [ ] **Storage 模块文档** (`docs/guide/storage.md`)：
  - 详述 5 大存储驱动（Memory、Web、Cookie、IndexedDB、Custom）差异。
  - 呈现同步与异步 API 的冲突拦截机制、TTL 与高效 GC 垃圾回收机制、防篡改签名加盐校验、批量操作事务回滚、`onChange` 联动监听同步。
  - 包含驱动与 API 极简兼容关系速查表。
  - 嵌入内置 Storage Playground 入口引导。

### 4. 开发内置 Storage Playground 组件

- [ ] 创建组件 `docs/components/StoragePlayground.vue`：
  - **编辑区**：提供一个带行数展示的 textarea，供输入 JavaScript 代码。内置典型操作模版（基础操作、过期 TTL、防篡改报错、联动订阅）的一键切换菜单。
  - **输出区**：捕获 `console.log` 和错误，高亮打印在网页内置日志控制台中。
  - **监视区**：利用卡片分别可视化 LocalStorage、SessionStorage、Cookies 的物理数据（包含前缀隔离），并提供 IndexedDB 底层物理大容量监控。
  - **调试操作**：提供手动触发 “运行 GC” 清理超时的按钮，演示垃圾回收。
- [ ] 在 `docs/.vitepress/theme/index.ts` 中注册 `StoragePlayground` 组件为全局组件，并在 `docs/guide/storage.md` 中通过 `<ClientOnly><StoragePlayground /></ClientOnly>` 标签嵌入。

### 5. 链接根目录快捷指令

- [ ] 在项目根目录的 [package.json](file:///Users/vyron/Mine/vii/package.json) 中追加脚本指令：
  - `"docs:dev": "pnpm --filter vii-docs dev"`
  - `"docs:build": "pnpm --filter vii-docs build"`

## 验证与回滚预案 (Validation & Rollback)

### 验证命令

1. **启动本地开发服务**：
   ```bash
   pnpm docs:dev
   ```
   检查控制台输出，在浏览器中打开站点核对各页面跳转与侧边栏目录是否正常。
2. **测试 Storage Playground 的交互**：
   在 Playground 中切换到 “TTL 过期控制”，设置 3 秒过期并执行，观察物理监视器上的数值卡片在 3 秒后是否由于过期/GC 而自动消失。
   测试向异步 IndexedDB 驱动调用同步 `set()`，确认控制台输出报错信息。
3. **打包构建校验**：
   ```bash
   pnpm docs:build
   ```
   确保在 SSR 构建模式下没有因引用浏览器对象（如 `window`, `document`, `navigator`）导致的编译阻断。

### 风险文件与回滚

- **风险**：修改根目录 `pnpm-workspace.yaml` 及根目录 `package.json`，可能会导致 pnpm 重建 node_modules 出错。
- **回滚方式**：若安装依赖报错，恢复这两个文件并执行 `git checkout -- pnpm-workspace.yaml package.json` 即可。
