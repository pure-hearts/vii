# @vyron/release

> 一键发布流水线

## Install

```bash
pnpm add @vyron/release
```

## Usage

```typescript
import { release } from "@vyron/release";

// 交互式发布
await release();

// 跳过交互
await release({
  cwd: process.cwd(),
  releaseAs: "patch",
  dryRun: true,
});
```

## API

### `release(options?)`

发布新版本。

#### Options

| Option        | Type      | Default         | Description                             |
| ------------- | --------- | --------------- | --------------------------------------- |
| `cwd`         | `string`  | `process.cwd()` | 工作目录                                |
| `dryRun`      | `boolean` | `false`         | 仅预览，不实际发布                      |
| `skipPublish` | `boolean` | `false`         | 跳过 NPM 发布                           |
| `skipPush`    | `boolean` | `false`         | 跳过 Git Push                           |
| `releaseAs`   | `string`  | 交互选择        | 发布类型 (patch/minor/major) 或指定版本 |

## License

MIT
