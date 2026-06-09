# vii

## 1. 简介

此项目是一个基于 [pnpm workspace](https://pnpm.io/) 的多包单体仓库（Monorepo），采用 **[Vite+](https://vite.plus/) (`vp`)** 作为统一开发构建、静态检查和代码格式化的一体化工具链，旨在提供极速的高效开发体验。

项目包含以下主要模块：

- **`@vyron/cli`** (`packages/cli`)：脚手架与命令行交互工具。
- **`@vyron/release`** (`packages/release`)：自动化版本发布和 Git 流管理工具。
- **`@vyron/utils`** (`packages/utils`)：通用的基础工具库（如嵌套属性持久化存储等）。

---

## 2. 项目结构 (Project Structure)

```
.
├── .github/             # GitHub 配置与 CI/CD 工作流
├── .trellis/            # Trellis 架构与本地开发规范工作区
├── packages/            # 项目核心子包 (pnpm workspace)
│   ├── cli/             # 1. 命令行脚手架工具 (@vyron/cli)
│   │   ├── index.js     # CLI 可执行文件入口 (指向 dist/index.mjs)
│   │   ├── vite.config.ts # vite-plus 构建配置文件
│   │   └── src/         # 脚手架交互命令及下载逻辑
│   ├── release/         # 2. 版本发布管线工具 (@vyron/release)
│   │   ├── vite.config.ts # vite-plus 构建配置文件
│   │   └── src/         # Git 校验/提交、NPM 镜像发布逻辑
│   └── utils/           # 3. 本地存储等通用基础库 (@vyron/utils)
│       ├── vite.config.ts # vite-plus 构建配置文件
│       └── src/         # 具备嵌套解析的 LocalStorage 操作库
├── package.json         # 根目录全局配置 (开发依赖、全局脚本及 Git Hook)
├── pnpm-workspace.yaml  # Workspace 范围配置定义
└── tsconfig.json        # 全局 TypeScript 基础配置
```

---

## 3. 开发指南 (Development Guide & Debugging)

### 依赖安装
在项目根目录下执行以安装所有依赖并初始化 Git 提交钩子：
```bash
pnpm install
```

### 代码规范与极速检查
项目采用 `vite-plus` 整合的超高速代码校验系统（底层为 `oxlint` 和 `oxfmt`）：
```bash
# 全局代码检查 (包括 Lint、Format 校验及 TypeScript 类型检测)
pnpm lint

# 快速自动格式化并修补所有代码风格问题
pnpm format

# 仅执行全局 TS 类型检查
pnpm typecheck
```
> [!NOTE]
> 项目配置了 `simple-git-hooks` 提交守卫。当执行 `git commit` 时，会自动静默执行 `pnpm exec vp check --fix`。未通过校验或无法修复的代码无法被提交，从而确保了代码库质量。

### 本地开发与实时调试
若想对本地代码（特别是 CLI 命令）进行修改并实时观察效果，可按以下步骤操作：

1. **开启编译监听 (Watch Mode)**：
   在根目录下以并行方式启动 `@vyron/cli` 的实时构建监听（也可以到子包目录下单独运行）：
   ```bash
   pnpm dev
   ```
   它会自动监测 `packages/cli/src` 下的文件变动，并在毫秒级内重构出最新的 `dist/index.mjs`。

2. **全局命令软链接调试**：
   在 `packages/cli` 目录下运行：
   ```bash
   pnpm link --global
   ```
   这会将 `vi` 和 `vii` 命令注册到系统的环境变量中，使其直接执行您本地的 `packages/cli/index.js`。
   此时，您可以在系统任意其他文件夹中直接调用：
   ```bash
   vii init
   # 或
   vii release
   ```
   进行实时调试。

3. **直接路径调试**（无需 link）：
   也可以直接通过 node 调用 CLI 的开发入口文件：
   ```bash
   node packages/cli/index.js init
   ```

---

## 4. 构建指南 (Build Guide)

项目采用基于 Rust 编译器内核的 `vite-plus` (`vp pack`) 进行一体化打包：

### 构建配置文件 (`vite.config.ts`)
相较于原先的 `unbuild`，新配置文件基于 Vite 标准进行拓展，支持模块别名（alias）与打包配置（`pack` 属性）：
- **`packages/utils`**：打包输出 ESM (`.mjs`) 与 CJS (`.cjs`)，并自动生成 dual-type TS 声明文件 (`.d.mts`, `.d.cts`)。
- **`packages/release`**：打包输出 ESM 及其 TS 声明文件。
- **`packages/cli`**：作为 Node CLI 工具，打包为压缩后的 ESM 并不输出类型文件，其中别名设置确保了 `prompts` 的轻量引入。

### 构建命令
在根目录下执行以下命令，即可完成所有子包的并发构建：
```bash
pnpm build
```

---

## 5. 使用指南 (Usage Guide)

### 🚀 项目初始化命令 (`vii init`)
用于快速拉取内置的精美模板并初始化新工程。

#### 1. 运行方式
```bash
vii init
```
#### 2. 执行流程
1. **项目名称询问**：询问您想创建的项目名称（必须符合 NPM 命名规范）。
2. **选择模板**：提供以下三个精心准备的内置模板：
   - `vue` (Vue 3 + Vite)
   - `react` (React 18 + Vite)
   - `node` (Node.js CLI)
3. **确认/清空目录**：检测目标路径。若不为空且未指定 `force`，则提供清空警告。
4. **拉取与部署**：自动从 GitHub 短地址（如 `github:vfiee/template-vue`）克隆最新模板，静默解压移动，并在退出时自动清除临时垃圾。

---

### 📦 版本自动发布命令 (`vii release`)
用于快速对当前开发的 npm package 执行自动化版本迭代与推送。其操作体验类似于 `bumpp`。

#### 1. 运行方式
```bash
vii release [options]
```

#### 2. 参数选项
- `--releaseAs <version>`：直接指定要升级的具体版本号（如 `1.0.1`）或发布级别（`patch` | `minor` | `major`）。
- `--dryRun`：模拟运行，在控制台打印版本变更流，但不实际修改 `package.json`、不创建 tag 和 commit。
- `--skipPush`：跳过 Git 推送分支和标签。
- `--skipPublish`：跳过 NPM 镜像库发布。

#### 3. 执行流程
1. **Git 工作区检测**：确认当前是 Git 仓库，且没有未提交的代码（如有会报错拦截以防脏提交）。
2. **读取 package.json**：读取当前 package 的 `name` 和 `version`。
3. **询问/计算新版本**：如果未提供 `--releaseAs`，交互式提供 `patch`、`minor`、`major` 等计算后的升级建议。
4. **更新与提交**：将新版本号写入 `package.json`，自动执行 `git add`、`git commit`（消息为 `chore(release): v<version>`）并打上 `v<version>` 版本的 Git Tag。
5. **网络推送与发布**：根据参数决定是否自动将分支和 Tag 推送至远程仓库（`git push`），并执行 `npm publish` 将产物推送至 NPM 仓库。

---

## 6. 许可证

此项目基于 [LICENSE](LICENSE) 文件中的内容授权。
