# 移除 test-mirror 命令

## Goal

删除 test-mirror 命令及其相关测试文件

## Requirements

1. 删除 `packages/cli/src/commands/test-mirror.ts` 文件
2. 删除 `packages/cli/test/test-mirror.test.ts` 文件
3. 从 `packages/cli/src/commands/index.ts` 中移除 `testMirrorCommand` 导出
4. 从 `packages/cli/src/utils/register.ts` 中移除 test-mirror/speed 命令的注册逻辑
5. 从 `packages/cli/test/register.test.ts` 中移除 test-mirror 相关测试用例
6. 更新帮助信息文本，移除 test-mirror 和 speed 命令说明

## Acceptance Criteria

- [x] `test-mirror.ts` 文件已删除
- [x] `test-mirror.test.ts` 文件已删除
- [x] `commands/index.ts` 中无 testMirrorCommand 引用
- [x] `register.ts` 中无 test-mirror/speed 相关逻辑
- [x] `register.test.ts` 中无 test-mirror 相关测试
- [x] `vii -h` 帮助信息中不再显示 test-mirror 命令
- [x] `vii test-mirror` 执行时报错"不支持的命令"
- [x] `vii speed` 执行时报错"不支持的命令"
