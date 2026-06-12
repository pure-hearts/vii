# Release 发布流水线 (@vyron/release)

`@vyron/release` 提供交互式的一键版本发布流水线，高度整合 Git 操作、CHANGELOG.md 更新、GitHub Release 声明以及 NPM 校验发布。它能像 `bumpp` 一样智能提升版本，更重要的是，它具备独特的**事务级回滚保护**，避免给你的代码仓库留下任何脏状态。

---

## 🚀 在线尝试

> [!TIP]
> **真实发版命令行沙盒体验**：
>
> 1. 点击下方按钮跳转至 StackBlitz 在线工作区。
> 2. 等待依赖安装完毕、包构建及全局命令挂载自动完成后（终端中会打印出绿色的初始化成功提示）。
> 3. 在终端中直接运行：`vii release --dry-run`，即可体验无副作用的事务型版本发布与回滚流程！您也可以尝试 `--minor --dry-run` 等参数。

<div class="playground-container" style="align-items: center; justify-content: center; padding: 2rem 0; margin-top: 1rem;">
  <a href="https://stackblitz.com/github/vfiee/project-boilerplate?file=packages/release/README.md&startScript=stackblitz:release" target="_blank" style="text-decoration: none; display: inline-flex; align-items: center; gap: 8px; background-color: var(--vp-c-brand-1); color: white; padding: 10px 24px; border-radius: 8px; font-weight: 600; font-size: 1.1rem; transition: background-color 0.2s;" onmouseover="this.style.backgroundColor='var(--vp-c-brand-2)'" onmouseout="this.style.backgroundColor='var(--vp-c-brand-1)'">
    ⚡ 立即在 StackBlitz 中尝试 VII Release
  </a>
</div>

---

## 💡 核心特性

对于新手来说，每次手动发版（修改版本号、打 Git Tag、推送到 GitHub、发布到 NPM）都是极其紧张的操作，一旦某步出错就会陷入“改不干净”的窘境。`@vyron/release` 正是为此设计的：

### 1. 三日前置红线校验 (Pre-check)

在开始任何发版步骤前，工具会在后台**无副作用地**校验以下条件，只要有一项不符合就立刻拦截并报错，绝不修改你的任何代码：

- **Git 仓库验证**：验证当前目录是否初始化了 Git。
- **工作区干净度校验**：当前分支不能有任何未提交的修改（脏代码限制），防止意外将未测试的代码发布出去。
- **NPM 登录状态校验**：自动在后台执行 `npm whoami` 校验，确保您在此终端已经登录了 npm 账号，防止发包最后一步因权限不足而报错中断。

### 2. 事务性自动回滚 (Atomicity Rollback)

这是本工具最核心的安全保障。如果在版本修改、Git Commit、打 Tag、远程推送（Push）以及 NPM 发布（Publish）的**任意一个环节**遭遇网络断开、超时或权限报错，系统会自动启动回滚程序：

1. 将 `package.json` 中的版本号修改退回。
2. 自动删除刚才在本地新创建的 Git Tag 和 Commit。
3. 恢复你最原始的、干净的代码树状态。

### 3. Dry Run 只读预览模式

不确定脚本执行后会发生什么？加上 `--dry-run` 参数，工具将在终端中完整渲染出版本升级的“操作执行树”，为你展示会修改什么文件、执行什么指令，但不产生任何实际写入，非常适合新手第一次调试时使用。

---

## ⌨️ 命令行发版指南 (CLI)

在已全局安装 `@vyron/cli` 或本地安装 `@vyron/release` 的项目中，您可以直接使用 `vii release` 命令。

### 1. 交互式发包流程（直接运行）

在你的项目根目录下输入：

```bash
vii release
```

系统会通过命令行询问你：

1. **`? Select version`**：让你选择升级的语义化级别：
   - `patch` (如 `1.0.0` -> `1.0.1`，用于小 Bug 修复)
   - `minor` (如 `1.0.0` -> `1.1.0`，用于新增功能)
   - `major` (如 `1.0.0` -> `2.0.0`，用于重大破坏性更新)
   - `custom` (手动输入一个版本号，如 `1.2.5-beta.0`)
2. **`? Confirm release`**：二次确认是否开始执行发版。确认后便会自动化完成版本写入、Git 提交与 NPM 镜像发布。

### 2. 参数字典

如果您希望跳过交互询问，或者想控制发版的细节，可以使用以下参数：

- `--releaseAs <version_or_level>`：直接指定升级级别或具体版本号。
- `--dryRun`：开启只读预览模式。
- `--skip-push`：只升级本地版本号并创建 Git 提交和 Tag，**不**推送到 GitHub 远程仓库。
- `--skip-publish`：只升级本地并推送 GitHub，**不**执行 NPM 发布。
- `--pre-release <identifier>`：创建预发布版本，例如指定参数 `rc` 配合 `minor` 会生成类似 `1.1.0-rc.0` 的版本。

**常用命令组合**：

```bash
# 模拟一次 Patch 级别的版本升级，看看执行效果
vii release --releaseAs patch --dryRun

# 仅进行本地代码的版本升级和 Git 打 Tag，先不推送到任何地方
vii release --releaseAs minor --skip-push --skip-publish
```

---

## 💻 编程式 API 示例

除了直接运行命令行，您也可以将发布流程写入您项目自定义的 JS 脚本中，实现更灵活的定制：

```typescript
import { release } from "@vyron/release";

// 运行发布脚本
await release({
  cwd: process.cwd(), // 运行的目标目录，默认为当前工作目录
  dryRun: false, // 是否只模拟运行
  minor: true, // 升级 minor (次要) 版本级别
  commitMessage: "chore(release): v{version}", // 自定义 Git 提交信息格式
  config: {
    parallel: false, // 在 Monorepo 中是否并行发包
    changelog: {
      output: "CHANGELOG.md", // CHANGELOG 文件的写入位置，传 false 可禁用
    },
  },
});
```

### `ReleaseOptions` 配置参数参考：

| 属性名          | 类型      | 默认值                         | 描述                                 |
| :-------------- | :-------- | :----------------------------- | :----------------------------------- |
| `cwd`           | `string`  | `process.cwd()`                | 执行发版的目标目录                   |
| `dryRun`        | `boolean` | `false`                        | 是否开启只读模拟预览                 |
| `releaseAs`     | `string`  | `undefined`                    | 显式指定版本层级或特定版本号         |
| `skipPush`      | `boolean` | `false`                        | 是否跳过 Git 分支与 Tag 的 Push 步骤 |
| `skipPublish`   | `boolean` | `false`                        | 是否跳过 NPM 包的发布步骤            |
| `commitMessage` | `string`  | `"chore(release): v{version}"` | Git commit 的描述模板                |
