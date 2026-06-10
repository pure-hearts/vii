# Add Vitest Unit Tests to CLI

## Goal

使用 vitest 创建 cli 的单元测试，覆盖到全部命令。

## Requirements

- 在 `packages/cli` 的 `devDependencies` 中引入并安装 `vitest`。
- 在 `packages/cli/package.json` 中配置 `"test": "vitest run"` 脚本。
- 编写 [register.test.ts](file:///Users/vyron/Mine/vii/packages/cli/src/utils/register.test.ts)，对 `packages/cli/src/utils/register.ts` 进行全面测试。
- 单元测试需覆盖所有命令和场景：
  - `init` / `create` 命令：校验普通执行与带参数执行。
  - `release` 命令：校验选项解析及缺少版本或不支持选项时的报错退出。
  - `list` 命令：校验执行与多余参数报错退出。
  - 未知选项、多余参数和拼写错误拦截逻辑：校验状态码 1 退出和对应报错输出。
- 测试过程中应 Mock 掉副作用（如 `process.exit`, `logger.error`, `commands` 真实调用），防止测试进程意外退出，且保持控制台输出整洁。

## Acceptance Criteria

- [ ] `packages/cli` 正确引入 `vitest` 并在 `package.json` 配置 `"test"` 运行指令。
- [ ] `packages/cli/src/utils/register.test.ts` 覆盖了全部命令及其所有边界异常流程。
- [ ] 执行 `pnpm --filter @vyron/cli test` 成功通过全部测试。
