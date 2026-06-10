# Complete CLI Package Unit Tests

## Goal

补齐 `@vyron/cli` 包的全部逻辑单元测试，使测试覆盖率与测试完备性更上一层楼。

## Requirements

- 为 [scaffold/validators.ts](file:///Users/vyron/Mine/vii/packages/cli/src/scaffold/validators.ts) 编写单元测试 `test/validators.test.ts`。
  - 测试 `validateProjectName` 匹配 NPM 包合法性规则。
  - 测试 `validateTargetDir` 检测目录空/满/覆盖规则。
  - 测试 `formatTargetDir` 正确格式化目录名。
- 为 [scaffold/fs/empty.ts](file:///Users/vyron/Mine/vii/packages/cli/src/scaffold/fs/empty.ts) 编写单元测试 `test/fs-empty.test.ts`。
  - 测试 `isEmpty` 对目录空或仅含 `.git` 的判定。
  - 测试 `emptyDir` 正确删除除 `.git` 外的所有文件。
- 为 `commands` 目录下的指令 Action（`init.ts`, `list.ts`, `release.ts`）编写测试 `test/commands.test.ts`。
  - Mock `prompts` 与 `scaffold`，测试 `initCommand` 无论是交互式还是参数直接传入都能正确调用。
  - 拦截 `console.log`，测试 `listCommand` 能正确格式化输出可用模板。
  - Mock `release` 入口，测试 `releaseCommand` 能正确转发给 `@vyron/release` 执行。

## Acceptance Criteria

- [ ] 新增 `test/validators.test.ts` 且测试全部通过。
- [ ] 新增 `test/fs-empty.test.ts` 且测试全部通过。
- [ ] 新增 `test/commands.test.ts` 且测试全部通过。
- [ ] 运行 `pnpm -F @vyron/cli exec vitest run --coverage`，整体覆盖率（Stmts, Lines, Branch）均保持高水平（>90%）。
