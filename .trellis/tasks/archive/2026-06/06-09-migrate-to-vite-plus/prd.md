# Migrate project build and tooling to vite-plus

## Goal

将项目（vii）的构建、格式化和代码静态检查工具链由原本碎片化的 `unbuild`, `oxlint`, `oxfmt` 替换为 VoidZero 团队推出的整合工具链 `vite-plus`（命令行工具 `vp`），以实现更快的运行速度与单配置文件（`vite.config.ts`）的统一开发体验。

## Requirements

1. **统一工具依赖**：
   - 根目录中安装 `vite-plus` 并删除 `unbuild`, `oxfmt`, `oxlint` 依赖。
   - 所有 packages 内部安装 `vite-plus` 和 `typescript`，确保开发时能够执行本地的 `vp` 模块构建。
2. **重构构建配置文件**：
   - 清理三个 package（`packages/cli`, `packages/release`, `packages/utils`）下的 `build.config.ts`。
   - 分别新增 `vite.config.ts`，定义各自的构建（`pack`）任务，包括入口、模块别名（alias）、压缩选项（minify）和声明文件生成（dts）。
3. **改造开发/提交/构建指令**：
   - 重新编写根目录及子 package 的 `package.json` 中的 `scripts` 脚本，全面对接 `vp pack` 与 `vp check` 命令。
   - 修改 `simple-git-hooks` 以在 `pre-commit` 时使用 `vp check --fix`。

## Acceptance Criteria

- [ ] 根目录执行 `pnpm run build` 时，能够顺利地对所有 3 个 workspace package 进行 `vp pack` 构建，无报错且在对应的 `dist/` 下产生正确的打包与类型声明文件。
- [ ] 根目录执行 `pnpm run lint` 和 `pnpm run format` 能够利用 `vp check` 分别跑完校验和快速格式化修补。
- [ ] 各 package 中的开发指令 `pnpm run dev`（映射到 `vp pack --watch`）能正常开启监听。
- [ ] 所有包中的废弃 `build.config.ts` 已被彻底删除。
