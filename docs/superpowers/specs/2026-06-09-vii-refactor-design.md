# VII 项目重构设计方案

## 概述

将 `vii` 从混合型 monorepo 重构为**专注于工具链**的 monorepo，采用激进式重构方案，为未来 3-5 年扩展打好基础。

### 重构目标

| 目标       | 说明                                   |
| ---------- | -------------------------------------- |
| 工具链聚焦 | CLI + 脚手架核心 + 发布流水线 + 工具库 |
| 完整 TS    | 100% TypeScript，无 any 类型           |
| 组件化解耦 | 模块独立，可单独使用/测试              |
| 可扩展架构 | 新增命令/功能无需重构现有代码          |

---

## 重构后的包结构

```
packages/
├── cli/           # CLI 入口 + 脚手架核心
├── release/      # 发布流水线
└── utils/        # 工具函数
```

### 包职责

| 包        | 职责                                       | 独立性                  |
| --------- | ------------------------------------------ | ----------------------- |
| `cli`     | 命令行入口、命令路由、脚手架核心、模板生成 | 核心包                  |
| `release` | Git 操作、版本计算、Changelog、npm 发布    | 可被其他工具直接 import |
| `utils`   | 通用工具函数（storage 等）                 | 无依赖                  |

---

## 各包详细设计

### 1. `@vyron/cli` — CLI 入口 + 脚手架核心

**设计原则**：CLI 作为核心包，包含命令路由和脚手架核心逻辑，内部模块化组织。

```
cli/
├── src/
│   ├── index.ts           # 入口，命令注册
│   ├── commands/          # 命令定义
│   │   ├── init.ts        # init 命令
│   │   └── release.ts     # release 命令
│   ├── scaffold/          # 脚手架核心模块
│   │   ├── index.ts       # 统一导出
│   │   ├── scaffold.ts    # 脚手架主逻辑
│   │   ├── download.ts    # 远程模板下载
│   │   ├── validators.ts  # 输入验证
│   │   └── fs/            # 文件系统操作
│   │       ├── copy.ts
│   │       ├── empty.ts
│   │       └── write.ts
│   ├── prompts/           # 交互式 prompts
│   │   ├── index.ts
│   │   ├── project.ts     # 项目名/目录 prompts
│   │   └── template.ts    # 模板选择 prompts
│   ├── options/           # 全局选项定义
│   │   └── index.ts
│   └── utils/
│       ├── logger.ts      # 统一日志输出
│       └── register.ts    # 命令注册
├── build.config.ts
└── package.json
```

**核心类型**：

```typescript
// 命令接口
interface Command {
  name: string
  description: string
  options: Option[]
  action: (args: ParsedArgs, ctx: Context) => Promise<void>
}

// Scaffold 配置
interface ScaffoldOptions {
  projectName: string
  template: string
  targetDir: string
  force?: boolean
}

// Context 上下文
interface Context {
  cwd: string
  verbose: boolean
  dryRun: boolean
}
```

**入口示例**：

```typescript
// cli/src/index.ts
import { register } from './utils/register'
import { initCommand } from './commands/init'
import { releaseCommand } from './commands/release'

export async function main() {
  await register([initCommand, releaseCommand])
}
```

**脚手架核心模块**：

```typescript
// cli/src/scaffold/scaffold.ts
export async function scaffold(options: ScaffoldOptions): Promise<void>

// 可单独使用的子模块
export { downloadTemplate } from './download'
export { validateProjectName } from './validators'
```

**Prompts 设计**（使用 prompts 库）：

```typescript
// cli/src/prompts/project.ts
export async function promptProjectName(): Promise<string> {
  const { name } = await prompts({
    type: 'text',
    name: 'name',
    message: 'Project name:',
    validate: (value) => validateProjectName(value) || 'Invalid project name',
  })
  return name
}
```

---

### 2. `@vyron/release` — 发布流水线

**设计原则**：一键式发布体验，类似 [bumpp](https://github.com/antfu/bumpp)，从 `package.json` 读取版本，交互式选择发布类型，一键完成版本更新 → Commit → Tag → Push → Publish。

```
release/
├── src/
│   ├── index.ts           # 统一导出
│   ├── run.ts             # 主流水线
│   ├── pkg.ts             # package.json 读取/写入
│   ├── steps/             # 发布步骤
│   │   ├── check-git.ts   # 检查 Git 状态
│   │   ├── bump-version.ts # 版本递增
│   │   ├── generate-changelog.ts
│   │   ├── commit.ts      # Git 提交
│   │   ├── tag.ts         # Git Tag
│   │   ├── push.ts        # Git Push
│   │   └── publish.ts     # NPM 发布
│   ├── git.ts             # Git 操作封装
│   ├── version.ts         # 版本计算
│   ├── changelog.ts       # Changelog 生成
│   ├── npm.ts             # NPM 操作封装
│   ├── prompts.ts         # 交互式发布选择
│   └── types.ts
├── package.json
└── build.config.ts
```

**核心 API**：

```typescript
export interface ReleaseOptions {
  cwd?: string // 工作目录，默认 process.cwd()
  dryRun?: boolean // 仅预览，不实际发布
  skipTests?: boolean // 跳过测试
  skipPublish?: boolean // 仅更新版本，不发布到 npm
  skipPush?: boolean // 跳过 git push
  releaseAs?: string // 手动指定版本（如 '1.0.0'、'minor'、'major'）
  all?: boolean // 发布所有包（monorepo 模式）
  package?: string // 指定单个包
}

export async function release(options?: ReleaseOptions): Promise<void>

// 独立步骤（可按需调用）
export { readPkg, writePkg } from './pkg'
export { bumpVersion } from './steps/bump-version'
export { generateChangelog } from './steps/generate-changelog'
export { commitAndTag } from './steps/commit'
export { pushToRemote } from './steps/push'
export { publishToNpm } from './steps/publish'
```

**package.json 读取与写入**：

```typescript
// pkg.ts
export interface PkgInfo {
  name: string
  version: string
  path: string
}

// 从 package.json 读取版本
export function readPkg(cwd: string = process.cwd()): PkgInfo

// 更新 package.json 版本号
export function writePkg(cwd: string, newVersion: string): Promise<void>
```

**一键发布流水线**（类似 bumpp）：

```typescript
// run.ts
export async function release(options: ReleaseOptions = {}) {
  const cwd = options.cwd ?? process.cwd()

  // 1. 读取当前版本
  const pkg = readPkg(cwd)
  console.log(`📦 当前版本: ${pkg.name}@${pkg.version}`)

  // 2. 交互式选择发布类型（patch/minor/major/指定版本）
  const releaseType = options.releaseAs ?? (await promptReleaseType()) // 使用 prompts 交互

  // 3. 计算新版本
  const newVersion = calculateNewVersion(pkg.version, releaseType)

  // 4. 更新 package.json
  await writePkg(cwd, newVersion)

  // 5. Git 提价
  if (!options.dryRun) {
    await gitAdd('.')
    await commit(`release: ${pkg.name}@${newVersion}`)
    await tag(`v${newVersion}`)
  }

  // 6. Git Push
  if (!options.skipPush && !options.dryRun) {
    await pushToRemote()
  }

  // 7. NPM 发布
  if (!options.skipPublish && !options.dryRun) {
    await publishToNpm({ cwd })
  }

  console.log(`✅ 发布完成: ${pkg.name}@${newVersion}`)
}
```

**交互式发布选择**（prompts，显示计算后的版本号）：

```typescript
// prompts.ts
export async function promptReleaseType(
  currentVersion: string,
): Promise<string> {
  const versions = {
    patch: calculateNewVersion(currentVersion, 'patch'),
    minor: calculateNewVersion(currentVersion, 'minor'),
    major: calculateNewVersion(currentVersion, 'major'),
  }

  const { type } = await prompts({
    type: 'select',
    name: 'type',
    message: '选择发布类型:',
    choices: [
      { value: 'patch', label: `Patch (bugfix) → ${versions.patch}` },
      { value: 'minor', label: `Minor (新功能) → ${versions.minor}` },
      { value: 'major', label: `Major (破坏性更新) → ${versions.major}` },
      { value: 'custom', label: '自定义版本' },
    ],
  })

  if (type === 'custom') {
    const { version } = await prompts({
      type: 'text',
      name: 'version',
      message: '输入版本号:',
      hint: currentVersion,
      initial: '',
    })
    return version || currentVersion
  }

  return type
}
```

**交互效果**：

```
? 选择发布类型: (Use arrow keys)
❯ Patch (bugfix) → 1.0.1
  Minor (新功能) → 1.1.0
  Major (破坏性更新) → 2.0.0
  自定义版本
```

---

### 3. `@vyron/utils` — 工具函数库

**设计原则**：小而专注的工具函数，无外部依赖。

```
utils/
├── src/
│   ├── index.ts
│   ├── storage.ts        # localStorage 封装
│   ├── color.ts          # terminal colors
│   └── string.ts         # 字符串工具
├── package.json
└── build.config.ts
```

**当前保留**：`storage.ts`（53 行）

**未来扩展方向**（按需）：

- `logger.ts` — 日志输出
- `fs.ts` — 文件系统工具
- `network.ts` — 网络请求工具

---

---

## 删除的包

### `@vyron/ui` — 完全删除

- 删除原因：无源代码，仅有编译产物
- 后续如需 UI 组件，独立仓库处理

### `@vyron/use-axios` — 完全删除

- 删除原因：不属于工具链方向
- 后续如需 HTTP 封装，可独立仓库处理

---

## 技术规范

### TypeScript 配置

所有包使用严格模式：

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "exactOptionalPropertyTypes": true
  }
}
```

### 包导出规范

```typescript
// 每个包的 src/index.ts 必须导出：
// 1. 主 API（主要用途）
// 2. 子模块（可供独立使用）
// 3. 类型定义
export { scaffold } from './scaffold'
export { downloadTemplate } from './scaffold/download'
export type { ScaffoldOptions } from './scaffold'
```

### 错误处理规范

```typescript
// 使用自定义错误类
export class DownloadError extends Error {
  constructor(
    message: string,
    public url: string,
    public cause?: unknown,
  ) {
    super(message)
    this.name = 'DownloadError'
  }
}

// 统一错误处理
try {
  await scaffold(options)
} catch (error) {
  if (error instanceof DownloadError) {
    console.error(`下载失败: ${error.url}`)
  }
  process.exit(1)
}
```

---

## 开发工作流

### 调试 CLI

```bash
# 方式 1：直接运行
pnpm --filter @vyron/cli dev

# 方式 2：link 后全局使用
cd packages/cli && pnpm link -g
vyron init my-project
```

### 添加新命令

在 `cli/src/commands/` 添加新文件：

```typescript
// cli/src/commands/upgrade.ts
export const upgradeCommand: Command = {
  name: 'upgrade',
  description: 'Upgrade project dependencies',
  options: [
    {
      name: 'package',
      short: 'p',
      type: 'string',
      description: 'Specific package to upgrade',
    },
  ],
  async action(args, ctx) {
    // 实现
  },
}
```

然后在 `index.ts` 注册：

```typescript
import { upgradeCommand } from './commands/upgrade'
await register([initCommand, releaseCommand, upgradeCommand])
```

---

## 文档要求

### README 模板

每个包必须包含：

````markdown
# @vyron/[package-name]

> 包的简短描述

## Install

```bash
pnpm add @vyron/[package-name]
```
````

## Usage

### 作为 CLI 使用

```bash
vyron [command]
```

### 作为模块使用

```typescript
import { mainApi } from '@vyron/[package-name]'

await mainApi()
```

## API

<!-- auto-generated from types -->

### `mainApi(options)`

描述...

### Options

| Option | Type     | Default     | Description |
| ------ | -------- | ----------- | ----------- |
| `opt1` | `string` | `'default'` | 说明        |

## License

MIT

```

---

## 重构阶段划分

### Phase 1: 基础设施（预计 1 天）

- [ ] 创建 `release/` 包（从 release-scripts 重命名）
- [ ] 迁移类型到 `release/src/types.ts`
- [ ] 配置构建脚本

### Phase 2: CLI 重构（预计 2 天）

- [ ] 重构 `cli/src/` 目录结构
- [ ] 创建 `scaffold/` 子模块
- [ ] 创建 `prompts/` 子模块
- [ ] 提取下载逻辑到 `scaffold/download.ts`
- [ ] 提取 fs 操作到 `scaffold/fs/`
- [ ] 测试 `vyron init` 功能

### Phase 3: 发布流水线（预计 1 天）

- [ ] 实现 `pkg.ts`（读取/写入 package.json）
- [ ] 实现 `prompts.ts`（交互式发布选择）
- [ ] 拆分 `release/src` 为独立步骤
- [ ] 实现一键发布流水线（版本 → Commit → Tag → Push → Publish）
- [ ] 添加单元测试
- [ ] 测试 `vyron release` 功能

### Phase 4: 清理与文档（预计 1 天）

- [ ] 删除 `ui/` 包
- [ ] 删除 `release-scripts/` 包（合并到 `release/`）
- [ ] 删除 `use-axios/` 包
- [ ] 完善各包 README
- [ ] 运行完整测试

---

## 验收标准

- [ ] `cli/src/` 代码行数 < 400 行（主文件 < 200 行）
- [ ] `cli/src/scaffold/` 和 `cli/src/prompts/` 模块化清晰
- [ ] `release/` 支持从 package.json 读取版本
- [ ] `release/` 支持一键发布（版本递增 → Commit → Tag → Push → Publish）
- [ ] `release/` 可独立被其他项目 import 使用
- [ ] 所有包 100% TypeScript，无 any
- [ ] 所有包有完整类型导出
- [ ] 每个包有 README 说明
- [ ] `pnpm build` 成功
- [ ] `pnpm typecheck` 通过
- [ ] `ui/` 包已删除
- [ ] `use-axios/` 包已删除
```
