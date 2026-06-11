# VitePress 文档集成与 Playground 开发规范

本文档记录本仓库官方文档系统的集成规范与 Playground 的开发要点，供后续维护与拓展参考。

---

## 1. 目录结构与工作区联动

官方文档统一位于项目根目录的 `docs/` 下：

- 文档必须声明为 pnpm workspace 成员，并在 `pnpm-workspace.yaml` 中进行追加。
- 外部依赖与本地包链接（如 `@vyron/storage: workspace:*`）统一配置在 `docs/package.json` 中。
- 根目录的 `package.json` 必须挂载对应的便捷代理脚本：
  ```json
  "docs:dev": "pnpm --filter vii-docs dev",
  "docs:build": "pnpm --filter vii-docs build"
  ```

---

## 2. 浏览器端交互组件的 SSR 安全隔绝

VitePress 构建在服务器端渲染 (SSR) 阶段，因此在模板或组件中访问浏览器端特有变量（如 `window`、`document`、`localStorage`、`sessionStorage`、`indexedDB`）会导致构建失败报错 `window is not defined`。

**规范要求**：
所有包含此类逻辑的交互式组件（如 `<StoragePlayground />`），在 Markdown 文档中挂载时**必须**包裹在 `<ClientOnly>` 容器中：

```markdown
<ClientOnly>
  <StoragePlayground />
</ClientOnly>
```

---

## 3. 在线 Playground 代码动态执行机制

为保证安全性与操作的连贯性：

- 避免直接引入庞大而臃肿的 Monaco Editor 导致静态资源包体积超限，应使用带格式保护的基础文本域代码编辑器。
- 动态执行 JavaScript 代码时，采用 `new Function` 构造异步 IIFE 环境，并注入统一的包方法及模拟控制台捕获器 `console`：
  ```javascript
  const run = new Function(
    "createStorage",
    "CookieStorageDriver",
    "IndexedDBStorageDriver",
    "MemoryStorageDriver",
    "console",
    `return (async () => {
      \${code.value}
    })()`,
  );
  ```
