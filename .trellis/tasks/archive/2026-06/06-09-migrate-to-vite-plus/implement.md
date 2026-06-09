# Implementation Plan - Migrate to vite-plus

## Execution Steps

- [ ] 1. **修改根目录配置文件**：
  - [ ] 修改 [package.json](file:///Users/vyron/Mine/vii/package.json) 里的开发依赖和 scripts。
- [ ] 2. **改造 packages/utils**：
  - [ ] 修改 [packages/utils/package.json](file:///Users/vyron/Mine/vii/packages/utils/package.json)。
  - [ ] 新建 [packages/utils/vite.config.ts](file:///Users/vyron/Mine/vii/packages/utils/vite.config.ts)。
  - [ ] 删除 [packages/utils/build.config.ts](file:///Users/vyron/Mine/vii/packages/utils/build.config.ts)。
- [ ] 3. **改造 packages/release**：
  - [ ] 修改 [packages/release/package.json](file:///Users/vyron/Mine/vii/packages/release/package.json)。
  - [ ] 新建 [packages/release/vite.config.ts](file:///Users/vyron/Mine/vii/packages/release/vite.config.ts)。
  - [ ] 删除 [packages/release/build.config.ts](file:///Users/vyron/Mine/vii/packages/release/build.config.ts)。
- [ ] 4. **改造 packages/cli**：
  - [ ] 修改 [packages/cli/package.json](file:///Users/vyron/Mine/vii/packages/cli/package.json)。
  - [ ] 新建 [packages/cli/vite.config.ts](file:///Users/vyron/Mine/vii/packages/cli/vite.config.ts)。
  - [ ] 删除 [packages/cli/build.config.ts](file:///Users/vyron/Mine/vii/packages/cli/build.config.ts)。
- [ ] 5. **依赖刷新与验证**：
  - [ ] 运行 `pnpm install` 以使根目录与子 workspace package 的新依赖生效并刷新 lockfile。
  - [ ] 执行 `pnpm run build`，确保各 package 能正常生成构建产物。
  - [ ] 执行 `pnpm run lint` 和 `pnpm run format`，验证 `vp check` 工作正常。

## Rollback Points

如果遇到任何打包失败或环境兼容问题，随时执行以下命令回滚代码，并利用 `pnpm install` 恢复原始环境：

```bash
git restore package.json packages/*/package.json
git clean -fd packages/*/vite.config.ts
# 恢复原配置文件
git checkout -- packages/*/build.config.ts
```
