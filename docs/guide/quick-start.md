# 快速开始

本指南将帮助您快速了解如何安装并开始体验 VII 工具链的各个模块。

---

## 1. 安装命令行工具 CLI

您可以在全局安装 `@vyron/cli` 供日常开发初始化项目使用：

```bash
# 使用 pnpm 安装
pnpm add -g @vyron/cli

# 或者使用 npm
npm install -g @vyron/cli
```

也可以使用免安装的 `npx` 指令直接运行：

```bash
npx @vyron/cli init my-project
```

---

## 2. 引入存储管理器 Storage

如果需要对浏览器端的数据持久化进行高阶保护和过期控制，可以安装并调用存储模块：

```bash
pnpm add @vyron/storage
```

在代码中初始化并使用：

```typescript
import { createStorage } from "@vyron/storage";

// 1. 创建带命名空间的同步 LocalStorage 实例
const store = createStorage("local", {
  prefix: "user_",
  expire: 24 * 3600 * 1000, // 默认全局 1 天过期
});

// 2. 写入与获取
store.set("profile", { name: "vyron", role: "admin" });
const name = store.get("profile", "name"); // 'vyron'

// 3. 订阅数据改变
store.onChange("profile", (newVal) => {
  console.log("User profile changed:", newVal);
});
```

---

## 3. 在项目中使用自动化发布 Release

在您的项目中安装版本自动升级与发布模块：

```bash
pnpm add @vyron/release -D
```

在项目的 `package.json` 中配置便捷发包脚本：

```json
{
  "scripts": {
    "release": "vii release"
  }
}
```

或者通过编程式 Node.js 脚本集成到您的 CI 中：

```typescript
import { release } from "@vyron/release";

async function runPublish() {
  await release({
    commitMessage: "chore: release {version}",
    skipPublish: false, // 实际发布到 npm
  });
}

runPublish();
```

---

## 接下来

查看各模块的专门指南以了解更高级的特性：

- [CLI 命令行工具](./cli)
- [Release 发布流水线](./release)
- [Storage 存储管理器](./storage)
