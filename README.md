# vii

## 简介

此项目是一个基于 [pnpm workspace](https://pnpm.io/) 的多包单体仓库（Monorepo），采用 **[Vite+](https://vite.plus/) (`vp`)** 作为统一开发构建、静态检查和代码格式化的一体化工具链，旨在提供极速的高效开发体验。

项目包含以下主要模块：

- **`@vyron/cli`** (`packages/cli`)：脚手架与命令行交互工具。
- **`@vyron/release`** (`packages/release`)：自动化版本发布和 Git 流管理工具。
- **`@vyron/utils`** (`packages/utils`)：通用的基础工具库（如嵌套属性持久化存储等）。

## 目录结构

```
.
├── .github/             # GitHub 配置与 CI/CD 工作流
├── .trellis/            # Trellis 架构与本地开发规范工作区
├── packages/            # 项目核心模块
│   ├── cli/             # 命令行工具
│   ├── release/         # 发布脚本与工具
│   └── utils/           # 通用工具函数
└── ...                  # 配置文件
```

## 安装

确保已安装 [Node.js](https://nodejs.org/) (>=20) 和 [pnpm](https://pnpm.io/)，并在全局安装了 `vp` 命令行工具（也可使用本地已配置的二进制代理）。

```bash
# 全局安装 vite-plus
curl -fsSL https://vite.plus | bash

# 安装项目依赖
pnpm install
```

## 使用

### 构建项目

运行以下命令构建所有 Package（内部调用 `vp pack` 打包）：

```bash
pnpm build
```

各 Package 拥有独立的 `vite.config.ts` 配置文件，由 `vite-plus` 一体化驱动构建，极速输出压缩代码与 TypeScript 声明文件。

### 启动开发监听

```bash
pnpm dev
```

### 静态检查与自动格式化

项目已深度结合 `vite-plus` 中超高速的 Rust 工具校验：

```bash
# 执行代码格式化并自动修复 Lint 问题
pnpm format  # 运行 vp check --fix

# 代码风格与 Lint 检查
pnpm lint    # 运行 vp check

# 仅执行 TypeScript 类型检查
pnpm typecheck
```

### Git 提交守卫

代码在提交前，由 `simple-git-hooks` 自动触发 `pre-commit` 钩子，并在本地静默执行 `pnpm exec vp check --fix` 对你的代码进行急速格式化和规则校验，确保不符合规范的代码不进入仓库。

## 许可证

此项目基于 [LICENSE](LICENSE) 文件中的内容授权。
