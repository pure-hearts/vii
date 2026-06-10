# @vyron/cli

> VII 工具链命令行工具（CLI）。为前端及微服务工程提供快速脚手架初始化、模板定制管理及一键版本发布等工程化支持。

---

## 🌟 核心特性

- **🚀 极速脚手架初始化**：一键生成标准项目模板，省去繁琐的基础配置工作。
- **🛠️ 内置多种精美模板**：原生提供 Vue 3 PC（Vite）、Vue 3 Mobile（Vite）、NestJS、uni-app TS 等丰富模板，均源自统一的模板代码仓库（`project-boilerplate`）分支，保持底层脚手架极简与轻量。
- **🌐 支持自定义 GitHub 仓库**：除了内置模板，用户可随时输入任意公开的 GitHub 地址（支持指定 `#branch`）进行项目拉取，自由度高。
- **⚡ 镜像并发测速（零代理干扰）**：在交互模式下，CLI 自动对国内常用 GitHub 镜像（如 KKGitHub、GitClone 等）发起**不经过系统代理的并发 HEAD 延迟测速**。响应延迟实时呈现在菜单中并自动标识 `[推荐]` 镜像，大幅提升国内克隆速度与成功率。
- **🧹 自动清理 Git 历史痕迹**：克隆模板后，CLI 自动擦除模板本身的 `.git` 元数据，确保项目生成后是干净独立的本地工作树。
- **🛡️ 防呆纠偏与错误捕获**：
  - **命令纠偏**：对未知指令或拼写错误（如输入 `releas` 或 `initd`）通过编辑距离算法智能推断并提示正确的命令（例如：`您是不是想输入 "release"?`）。
  - **参数界限**：自动拦截未知 Option 或越界的位置参数（例如限制位置参数唯一性），并在终端醒目呈现红色错误信息。
- **📦 一键版本发布**：集成轻量级版本发布控制（功能类似于 bumpp），支持 `--dry-run`、`--release-as` 等，并全自动化构建、修改配置与 NPM 发布。

---

## 💻 安装说明

### 全局安装

```bash
pnpm add -g @vyron/cli
# 或者使用 npm
npm install -g @vyron/cli
```

### 临时运行 (免安装)

```bash
npx @vyron/cli init <your-project-name>
```

---

## 🔄 初始化执行流程图 (Workflow)

```mermaid
graph TD
    A[执行 vii / vii init] --> B{是否交互模式?}
    B -- 否: 命令行指定参数 --> C[解析项目名/模板/镜像等参数]
    B -- 是: 交互式询问 --> D[输入项目名称]
    D --> E[选择项目模板]
    E --> E1{模板是否为自定义?}
    E1 -- 是 --> E2[输入自定义 GitHub 仓库地址]
    E1 -- 否 --> F[执行国内 GitHub 镜像源测速 (不使用代理)]
    E2 --> F
    F --> G[选择或输入加速镜像]
    G --> H[将最终克隆地址与分支传入脚手架]
    C --> H
    H --> I[执行 git clone 下载到临时目录]
    I --> J[拷贝文件至目标项目目录]
    J --> K[过滤清理 .git 模板仓库历史信息]
    K --> L[提示项目创建成功]
```

---

## ⌨️ 常用命令详解

`vii` 提供了一组直观的命令来执行对应动作，格式为 `vii [Command] [Options]`。

### 1. `vii init [DIRECTORY]` 或 `vii create`

创建新的项目工程。如果未传参数，将自动启动交互式引导。

- **位置参数**：
  - `DIRECTORY`：目标目录名/项目名称（必须符合 npm 包命名规范）。
- **可用选项**：
  - `-t, --template NAME`：指定拉取模板的名称（支持 `vue-pc`, `vue-mobile`, `nest-ts`, `uniapp-ts` 或自定义地址 `github:user/repo#branch`）。
  - `-m, --mirror URL`：指定 GitHub 镜像源进行加速（支持如 `https://kkgithub.com`、`https://gitclone.com` 或者是自定义地址）。
  - `-f, --force`：当目标目录不为空时强制清空并覆盖。

**示例**：

```bash
# 1. 直接拉取内置 Vue 3 PC 模板，并指定使用 kkgithub 镜像加速
vii init my-app -t vue-pc -m https://kkgithub.com

# 2. 从自定义的 GitHub 仓库及其 release 分支拉取模板
vii init my-app -t github:my-username/my-template#release

# 3. 强制在已有目录中重新初始化
vii init my-app --force
```

---

### 2. `vii list`

列出所有内置的项目模板及其对应的 GitHub 原始分支映射，方便用户查阅。

- 该命令不接受任何参数。

**示例**：

```bash
vii list
```

---

### 2.5 `vii test-mirror` 或 `vii speed`

手动对内置的 GitHub 镜像源进行非代理并发测速，在终端中直观展示延迟报告，并自动推荐最快的源和命令样例。

- 该命令不接受任何参数。

**示例**：

```bash
vii test-mirror
# 或者使用别名
vii speed
```

---

### 2.6 `vii mirror [SUBCOMMAND] [ARGS]`

GitHub 镜像源管理器。支持查看、测速、添加及删除自定义加速镜像，配置会自动持久化在用户家目录的 `~/.viirc` 文件中。在执行交互式初始化时，CLI 会自动拉取最新的内置与自定义镜像供用户选择。

- **子命令**：
  - `默认` (不传子命令) 或 `list` / `ls`：展示当前所有的内置和自定义镜像源列表。
  - `speed`：对所有已有镜像源进行并发非代理延迟测速，并推荐最快的源。
  - `add <name> <url>`：添加自定义镜像源，校验 URL 合法性并防止与已有镜像重名。
  - `delete <name>`：删除指定的自定义镜像源（内置镜像如 GitHub、KKGitHub、GitClone 不允许被删除）。

**示例**：

```bash
# 1. 查看当前所有镜像源（含 [内置] 和 [自定义] 标识）
vii mirror
# 或
vii mirror list

# 2. 对所有已有镜像源进行并发测速
vii mirror speed

# 3. 添加一个自定义的 GitHub 镜像加速源
vii mirror add my-mirror https://github.com.cnps.org

# 4. 删除指定的自定义镜像源
vii mirror delete my-mirror
```

---

### 3. `vii release`

一键版本发布工具。帮助您快速修改包版本、生成 Git Tag 并自动发布到 NPM。

- **可用选项**：
  - `--dry-run`：只模拟发布过程，不实际写入 package.json，也不执行 git push 或 npm publish。
  - `--release-as <version_or_type>`：指定发布版本或升级类型（如 `patch`, `minor`, `major` 或具体的 `1.2.0`）。
  - `--skip-push`：跳过执行 `git push` 步骤。
  - `--skip-publish`：跳过执行 `npm publish` 步骤。

**示例**：

```bash
# 模拟发布次要版本 (minor)
vii release --release-as minor --dry-run

# 跳过发布到 npm，只在本地更新版本和 git tag
vii release --skip-publish
```

---

## 🛡️ 智能防呆与校验反馈

CLI 拥有健全的参数拦截和拼写报错提醒机制，保证命令行的执行可靠度：

- **未知选项校验**：执行 `vii init my-app --tempalte vue`（由于将 `template` 拼错）会抛出报错：
  `❌ 不支持的选项: --tempalte`
- **未知命令模糊匹配**：执行 `vii releas` 拼错命令时，会自动启动编辑距离计算并友好提示：
  `❌ 不支持的命令: releas。您是不是想输入 "release"?`
- **多余参数控制**：`vii init my-app extra-arg` 会被检测到有多余的位置参数而安全拦截，防止参数覆盖。

---

## 📄 授权协议

MIT
