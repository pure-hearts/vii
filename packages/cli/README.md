# @vyron/cli

> VII 工具链 CLI 入口

## Install

```bash
pnpm add -g @vyron/cli
```

## Usage

```bash
# 创建新项目 (默认进入交互式向导)
vii init

# 发布新版本
vii release
```

## Workflow

下面是 `vii` 初始化项目的核心流程图：

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

## Commands

### init

创建新项目脚手架。

```bash
# 1. 基础用法
vii init my-app

# 2. 强制覆盖已有目录
vii init my-app --force

# 3. 指定模板名称 (如内置的 vue-pc, vue-mobile, nest-ts, uniapp-ts)
vii init my-app --template vue-pc

# 4. 指定自定义 GitHub 仓库地址 (格式为 github:user/repo#branch 或 完整 git 链接)
vii init my-app --template github:user/repo#branch

# 5. 指定特定的 GitHub 镜像加速源 (支持命令行直接覆盖)
vii init my-app --template vue-pc --mirror https://kkgithub.com
```

> **注**：在交互模式下，CLI 会自动对国内常用的 GitHub 镜像（如 KKGitHub、GitClone）进行**不使用代理的并发延迟测速**，并用 `[推荐]` 标识响应最快的源供您选择。

### release

一键发布（类似 bumpp）。

```bash
vii release
vii release --dry-run
vii release --release-as minor
vii release --skip-publish
```

## License

MIT
