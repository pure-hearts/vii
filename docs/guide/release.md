# Release 发布流水线 (@vyron/release)

`@vyron/release` 提供交互式的一键版本发布流水线，高度整合 Git 操作、CHANGELOG.md 更新、GitHub Release 声明以及 NPM 校验发布。

---

## 🚀 在线尝试

> [!TIP]
> **真实发版命令行沙盒体验**：
>
> 1. 点击下方按钮跳转至 StackBlitz 在线工作区。
> 2. 在打开的 Node 终端中，运行：`npx -y @vyron/release --dry-run`
> 3. 您也可以指定参数运行，例如 `npx -y @vyron/release --minor --dry-run` 体验无副作用的预览式发布。

<div class="playground-container" style="align-items: center; justify-content: center; padding: 2rem 0; margin-top: 1rem;">
  <a href="https://stackblitz.com/fork/node?title=VII%20Release%20Playground" target="_blank" style="text-decoration: none; display: inline-flex; align-items: center; gap: 8px; background-color: var(--vp-c-brand-1); color: white; padding: 10px 24px; border-radius: 8px; font-weight: 600; font-size: 1.1rem; transition: background-color 0.2s;" onmouseover="this.style.backgroundColor='var(--vp-c-brand-2)'" onmouseout="this.style.backgroundColor='var(--vp-c-brand-1)'">
    ⚡ 立即在 StackBlitz 中尝试 VII Release
  </a>
</div>

---

## 💡 核心特性

- **发包前冲突校验**：发布时首先请求 npm 注册表校验目标版本号，若已发布则直接拦截报错，规避物理发包失败导致的脏状态。
- **物理自动回滚 (Atomicity Rollback)**：当在 git commit、tag、push 或 npm publish 等任意步骤中遭遇网络超时或权限异常时，系统会自动将 `package.json` 中的版本修改回退，并移除新创建的本地 Git Tag，实现发布操作的事务原子性。
- **Dry Run 预览模式**：提供完整的 `--dry-run` 参数，能够打印出整个流水线的执行树以及各项命令的拟输出，不产生任何副作用。

---

## 🛠️ CLI 指南

```bash
# 交互式发布主流程
vii release

# 指定升级语义化版本 (patch/minor/major/自定义)
vii release --minor
vii release --custom 2.0.0

# 预发布标识
vii release --minor --pre-release rc

# 常用跳过标识
vii release --skip-publish        # 仅更新版本与 Git Tag，不推至 npm
vii release --skip-confirm        # 跳过二次确认
vii release --skip-github-release # 不创建 GitHub Release Note
```

---

## 💻 编程式 API 示例

您也可以在脚本中将发布功能嵌入：

```typescript
import { release } from "@vyron/release";

await release({
  cwd: process.cwd(),
  dryRun: false,
  minor: true,
  commitMessage: "chore: bump to {version}",
  config: {
    parallel: false, // 针对 monorepo 时是否并行发包
    changelog: { output: "CHANGELOG.md" },
  },
});
```
