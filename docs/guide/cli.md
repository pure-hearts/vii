# CLI 命令行工具 (@vyron/cli)

`@vyron/cli` 提供了全局命令行工具 `vii`（以及别名 `vi`），负责工程初始化、镜像源管理及一键版本发布等核心工程化任务。它是你的前端开发助手，帮你一键生成项目模版，省去繁琐的基础配置工作。

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

## 🛠️ 准备工作

在安装之前，请确保您的电脑上已经安装了 **Node.js**（版本建议在 `18.0.0` 或以上）。

您可以通过在终端（Terminal / CMD）中输入以下命令来检查 Node.js 版本：

```bash
node -v
```

_如果输出的版本号小于 18，请前往 [Node.js 官网](https://nodejs.org/) 下载最新长期支持版 (LTS)。_

---

## 💻 安装说明

### 免安装临时运行 (最推荐 ✨)

如果您不想往电脑里安装多余的全局依赖，可以直接使用 `npx` 命令来临时运行脚手架：

```bash
npx @vyron/cli init my-project
```

_说明：`npx` 会自动下载最新版的 `vii` 客户端，在帮你初始化好名为 `my-project` 的项目后，会自动将脚手架从电脑中清理掉，不占用多余的全局空间。_

### 全局安装长期使用

如果您经常使用它，可以把它全局安装到系统里，这样以后在任何地方直接输入 `vii` 就可以运行。

```bash
pnpm add -g @vyron/cli  # 使用 pnpm 安装
# 或者使用 npm
npm install -g @vyron/cli
```

> [!WARNING]
> **新手避坑（macOS / Linux 报错 `EACCES` 权限问题）**：
> 如果在全局安装时遇到含有 `Permission denied` 相关的红色报错，说明你的系统限制了全局目录的写入权限。您可以在命令前加上 `sudo` 重新运行（需要输入系统开机密码）：
>
> ```bash
> sudo npm install -g @vyron/cli
> ```

---

## 🔄 交互式创建项目步骤

运行 `vii init`，即可跟随命令行的中文交互式询问，一步步完成新项目创建。

1. **第一步：给你的项目起个名字**
   控制台会提示：`? Project name: `。
   _注意：名字只能用英文、数字、中划线 `-`，不要使用中文或空格。输入后按回车。_
2. **第二步：选择你要的项目模板**
   提示：`? Select a template: `。使用键盘的上下箭头 `↑` `↓` 选择，回车确认：
   - `vue-pc`：适合在电脑浏览器上打开的 Vue 3 Web 网页。
   - `vue-mobile`：适合手机微信、H5 移动端网页。
   - `nest-ts`：适合做后端的 NestJS 框架模版。
   - `uniapp-ts`：适合开发多端微信小程序、App 的 uni-app 模版。
3. **第三步：选择加速下载通道**
   提示：`? Select a mirror source: `。
   此时，脚手架会自动在后台对 GitHub 的国内各大加速网站进行非代理测速。菜单中延迟最小的那个源会标有 **`[推荐]`**（例如 KKGitHub）。直接按下回车键，脚手架就会以最快的速度为你下载项目模板！
4. **第四步：进入项目，开发！**
   下载完成后，你会看到成功提示。接下来依次运行：
   ```bash
   cd my-project     # 进入项目文件夹
   pnpm install      # 安装项目所需要的依赖包
   pnpm dev          # 启动本地开发服务，开写代码！
   ```

---

## ⌨️ 常用命令与参数字典

除了交互式模式，您也可以直接在命令行中传递位置参数与选项参数进行快速执行。

### `vii init [DIRECTORY] [OPTIONS]`

创建新项目工程。

- **位置参数**：
  - `DIRECTORY`：目标目录名/项目名称（必须符合 npm 包命名规范）。
- **可用选项**：
  - `-t, --template <name>`：指定预设的模板（`vue-pc`, `vue-mobile`, `nest-ts`, `uniapp-ts`）或公开的 GitHub 库（格式为 `github:user/repo#branch`）。
  - `-m, --mirror <url>`：指定加速的 GitHub 镜像源，直接跳过测速步骤。
  - `-f, --force`：当目标目录不为空时，强制清空并覆盖。

**示例**：

```bash
# 直接拉取内置 vue-pc 模板并指定使用 kkgithub 镜像加速
vii init my-app -t vue-pc -m https://kkgithub.com

# 从自定义的 GitHub 仓库及指定分支拉取模板
vii init my-app -t github:my-username/my-template#release

# 强制在已有目录中重新初始化（这会先清空原文件夹！）
vii init my-app --force
```

---

## 🌐 镜像源配置管理器

为国内开发者提供加速克隆镜像源的增删改查及延迟测速，配置将自动持久化至用户家目录的 `~/.viirc` 配置文件中。

### `vii mirror [SUBCOMMAND]`

管理 GitHub 镜像源列表。

- **子命令**：
  - `vii mirror list` (或不传子命令): 查看所有内置及用户自定义的镜像源。
  - `vii mirror speed` (或快速别名 `vii speed` / `vii test-mirror`): 对所有源发起并发延迟测速，并输出报告和最优推荐。
  - `vii mirror add <name> <url>`: 添加自定义 GitHub 加速镜像，会自动校验 URL 合法性。
  - `vii mirror delete <name>`: 删除指定的自定义镜像源（内置系统源受保护，无法被删除）。

**示例**：

```bash
# 测速所有镜像源并输出延迟排行
vii speed

# 添加一个自定义的 GitHub 镜像加速源
vii mirror add my-mirror https://github.com.cnps.org

# 删除指定的自定义镜像源
vii mirror delete my-mirror
```

---

## 🛡️ 智能防呆与校验反馈

为了防止手快输入错误指令导致命令运行失败，`vii` 拥有健全的参数拦截和模糊拼写纠偏机制：

- **未知选项校验**：执行 `vii init my-app --tempalte vue`（拼错 `template`）会直接抛出报错并提示正确拼写：
  `❌ 不支持的选项: --tempalte。您是不是想输入 "--template"?`
- **命令模糊匹配纠偏**：输入未知指令（如 `vii initd` 或 `vii releas`）时，系统基于**编辑距离算法**自动推断并友好提示：
  `❌ 不支持的命令: initd。您是不是想输入 "init"?`
- **多余参数控制**：`vii init my-app extra-arg` 会被检测到有多余的位置参数而安全拦截，防止误操作。
