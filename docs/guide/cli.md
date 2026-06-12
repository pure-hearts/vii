# CLI 命令行工具 (@vyron/cli)

`@vyron/cli` 提供了全局命令行工具 `vii`（以及别名 `vi`），负责工程初始化、镜像源管理及一键版本发布等核心工程化任务。

---

## 🚀 在线尝试

> [!TIP]
> **真实 Node.js 终端沙盒体验**：
> 依托 StackBlitz Webcontainer 技术，您不需要在本地配置任何环境，即可在浏览器的真实 Node.js 虚拟沙盒中运行并体验 `vii` 命令行！
>
> 1. 点击下方按钮打开 StackBlitz 工作区。
> 2. 等待依赖安装完毕、包构建及全局命令挂载自动完成后（终端中会打印出绿色的初始化成功提示）。
> 3. 在终端中直接运行：`vii init test-project`，即可体验交互式模板克隆与零代理镜像并发测速！

<div class="playground-container" style="align-items: center; justify-content: center; padding: 2rem 0; margin-top: 1rem;">
  <a href="https://stackblitz.com/github/vfiee/project-boilerplate?file=packages/cli/README.md&startScript=stackblitz:cli" target="_blank" style="text-decoration: none; display: inline-flex; align-items: center; gap: 8px; background-color: var(--vp-c-brand-1); color: white; padding: 10px 24px; border-radius: 8px; font-weight: 600; font-size: 1.1rem; transition: background-color 0.2s;" onmouseover="this.style.backgroundColor='var(--vp-c-brand-2)'" onmouseout="this.style.backgroundColor='var(--vp-c-brand-1)'">
    ⚡ 立即在 StackBlitz 中尝试 VII CLI
  </a>
</div>

---

## 💡 核心特性

### 1. 镜像并发测速与加速

在国内拉取 GitHub 模板经常遇到连接失败或网络极慢的问题。`vii` 内置了以下机制：

- 在交互式创建模板或运行 `vii speed` 时，CLI 自动发起**不经过全局代理干扰的并发 HEAD 请求**，针对国内常用的 GitHub 代理源（如 KKGitHub、GitClone 等）测速。
- 在选择列表中会直观呈现延迟，并自动高亮最优推荐源，使得克隆成功率几乎达到 100%。

### 2. 拼写模糊纠偏 (Failsafe Help)

为防止由于手快输入错误指令导致命令运行失败，`vii` 基于**编辑距离算法**，在输入未知命令时给出相似纠正建议：

```bash
$ vii initd
❌ 不支持的命令: initd。您是不是想输入 "init"?
```

---

## ⌨️ 命令参考

### `vii init [DIRECTORY]`

创建新项目工程。若缺省参数则进入交互式对话。

- `-t, --template <name>`: 指定预设的模板（`vue-pc`, `vue-mobile`, `nest-ts`, `uniapp-ts`）或公开的 GitHub 库（`github:user/repo#branch`）。
- `-m, --mirror <url>`: 指定加速的 GitHub 镜像源。
- `-f, --force`: 强制清空并覆盖同名文件夹。

### `vii mirror [SUBCOMMAND]`

管理镜像源，自定义配置会持久化至用户家目录 `~/.viirc`。

- `vii mirror list` (或不传): 查看所有系统内置及用户自定义的镜像源。
- `vii mirror add <name> <url>`: 添加自定义 GitHub 加速镜像。
- `vii mirror delete <name>`: 删除自定义镜像源（内置源被防呆保护，无法删除）。
- `vii mirror speed`: 对所有源发起测速并输出报告。

### `vii test-mirror` / `vii speed`

单独调用对内置 GitHub 镜像源的并发非代理测速。
