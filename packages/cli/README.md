# @vyron/cli

> VII 工具链 CLI 入口

## Install

```bash
pnpm add -g @vyron/cli
```

## Usage

```bash
# 创建新项目
vyron init

# 发布新版本
vyron release
```

## Commands

### init

创建新项目脚手架。

```bash
vyron init my-app
vyron init my-app --template vue
vyron init my-app --force
```

### release

一键发布（类似 bumpp）。

```bash
vyron release
vyron release --dry-run
vyron release --release-as minor
vyron release --skip-publish
```

## License

MIT
