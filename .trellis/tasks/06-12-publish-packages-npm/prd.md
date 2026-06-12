# Publish Three Packages to NPM

## Goal

将 Monorepo 下的三个核心包发布至 NPM 官方注册表（npmjs），满足指定的版本要求：

- `@vyron/cli`: `2.0.0`
- `@vyron/release`: `2.0.0`
- `@vyron/storage`: `1.0.0`

## Confirmed Facts

1. 当前包的本地版本状态：
   - `@vyron/cli` (`packages/cli/package.json`): 当前为 `1.2.4`，需升级至 `2.0.0`。
   - `@vyron/release` (`packages/release/package.json`): 当前为 `1.0.0`，需升级至 `2.0.0`。
   - `@vyron/storage` (`packages/storage/package.json`): 当前为 `1.0.0`，本次发布维持 `1.0.0`。
2. 真实的发包操作需要在本地已登录官方 npm（`https://registry.npmjs.org/`）且对 `@vyron/` 组织命名空间拥有发布权限的账号。

## Requirements

1. 检查本地 NPM 登录状态：在正式运行前，使用 `npm whoami` 校验账号，确保已登录。
2. 逐一在子包目录下执行发包操作：
   - **`@vyron/storage`**：在 `packages/storage` 下执行发版命令，发布 `1.0.0` 版本。
   - **`@vyron/release`**：在 `packages/release` 下执行发版命令，将版本升级并发布为 `2.0.0`。
   - **`@vyron/cli`**：在 `packages/cli` 下执行发版命令，将版本升级并发布为 `2.0.0`。
3. 发布期间，若遭遇网络或权限中断，利用发包工具自带的自动回滚机制恢复代码树，保证没有脏数据。

## Acceptance Criteria

- [ ] 本地执行 `npm whoami` 有成功登录的账号，且对对应的 packages 有发布权限。
- [ ] 三个子包以指定的版本号成功在 npmjs 注册表中注册与发布。
- [ ] 本地 Git 仓库自动打上相应的版本 Tag 并保持工作区 Clean。
