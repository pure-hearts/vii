# VII 项目重构实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 vii 重构为专注于工具链的 monorepo，包含 CLI + 发布流水线 + 工具库

**Architecture:** 三个核心包（cli/release/utils），cli 内部模块化组织（scaffold/prompts/commands），release 支持一键发布（类似 bumpp）

**Tech Stack:** TypeScript (strict), pnpm workspace, unbuild, prompts

---

## 文件结构概览

```
packages/
├── cli/                    # CLI 入口 + 脚手架核心
│   └── src/
│       ├── index.ts        # 入口，命令注册
│       ├── commands/       # 命令定义
│       ├── scaffold/       # 脚手架核心
│       ├── prompts/        # 交互式 prompts
│       ├── options/        # 全局选项
│       └── utils/          # 通用工具
├── release/                # 发布流水线
│   └── src/
│       ├── index.ts
│       ├── run.ts
│       ├── pkg.ts          # package.json 读写
│       ├── steps/          # 发布步骤
│       ├── git.ts
│       ├── version.ts
│       ├── changelog.ts
│       ├── npm.ts
│       ├── prompts.ts      # 交互式发布选择
│       └── types.ts
└── utils/                  # 工具函数
    └── src/
        └── storage.ts
```

---

## Phase 1: 基础设施

### Task 1: 创建 release/ 包基础结构

**Files:**

- Create: `packages/release/package.json`
- Create: `packages/release/build.config.ts`
- Create: `packages/release/tsconfig.json`
- Create: `packages/release/src/index.ts`

- [ ] **Step 1: 创建 packages/release/package.json**

```json
{
  "name": "@vyron/release",
  "version": "1.0.0",
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs"
    }
  },
  "main": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "unbuild",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "prompts": "^2.4.2",
    "semver": "^7.7.1"
  },
  "devDependencies": {
    "@types/semver": "^7.5.8",
    "typescript": "^5.7.2"
  }
}
```

- [ ] **Step 2: 创建 packages/release/build.config.ts**

```typescript
import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  entries: ['src/index'],
  declaration: true,
  clean: true,
})
```

- [ ] **Step 3: 创建 packages/release/tsconfig.json**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 4: 创建 packages/release/src/index.ts**

```typescript
export interface ReleaseOptions {
  cwd?: string
  dryRun?: boolean
  skipTests?: boolean
  skipPublish?: boolean
  skipPush?: boolean
  releaseAs?: string
  all?: boolean
  package?: string
}

export async function release(options: ReleaseOptions = {}): Promise<void> {
  // TODO: 实现
}
```

- [ ] **Step 5: Commit**

```bash
git add packages/release/
git commit -m "feat(release): create release package structure"
```

---

### Task 2: 创建 release/src/types.ts

**Files:**

- Create: `packages/release/src/types.ts`

- [ ] **Step 1: 创建类型定义**

```typescript
// 发布选项
export interface ReleaseOptions {
  cwd?: string
  dryRun?: boolean
  skipTests?: boolean
  skipPublish?: boolean
  skipPush?: boolean
  releaseAs?: string
  all?: boolean
  package?: string
}

// package.json 信息
export interface PkgInfo {
  name: string
  version: string
  path: string
}

// 发布步骤
export interface ReleaseStep {
  name: string
  run: () => Promise<void>
}

// Git 提交信息
export interface CommitInfo {
  message: string
  files?: string[]
}

// 版本类型
export type ReleaseType = 'patch' | 'minor' | 'major' | 'custom'
```

- [ ] **Step 2: 更新 packages/release/src/index.ts 导入类型**

```typescript
export type {
  ReleaseOptions,
  PkgInfo,
  ReleaseStep,
  CommitInfo,
  ReleaseType,
} from './types'
```

- [ ] **Step 3: Commit**

```bash
git add packages/release/src/types.ts packages/release/src/index.ts
git commit -m "feat(release): add type definitions"
```

---

### Task 3: 创建 release/src/pkg.ts (package.json 读写)

**Files:**

- Create: `packages/release/src/pkg.ts`

- [ ] **Step 1: 创建 pkg.ts**

```typescript
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { PkgInfo } from './types'

/**
 * 从 package.json 读取版本信息
 */
export function readPkg(cwd: string = process.cwd()): PkgInfo {
  const pkgPath = resolve(cwd, 'package.json')
  const content = readFileSync(pkgPath, 'utf-8')
  const pkg = JSON.parse(content) as { name: string; version: string }

  return {
    name: pkg.name,
    version: pkg.version,
    path: pkgPath,
  }
}

/**
 * 更新 package.json 版本号
 */
export function writePkg(cwd: string, newVersion: string): void {
  const pkgPath = resolve(cwd, 'package.json')
  const content = readFileSync(pkgPath, 'utf-8')
  const pkg = JSON.parse(content) as { version: string }

  pkg.version = newVersion

  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8')
}
```

- [ ] **Step 2: 更新 index.ts 导出**

```typescript
export { readPkg, writePkg } from './pkg'
export type { PkgInfo } from './types'
```

- [ ] **Step 3: Commit**

```bash
git add packages/release/src/pkg.ts packages/release/src/index.ts
git commit -m "feat(release): add pkg.ts for package.json read/write"
```

---

### Task 4: 创建 release/src/version.ts (版本计算)

**Files:**

- Create: `packages/release/src/version.ts`

- [ ] **Step 1: 创建 version.ts**

```typescript
import semver from 'semver'
import type { ReleaseType } from './types'

/**
 * 计算新版本号
 */
export function calculateNewVersion(
  currentVersion: string,
  releaseType: ReleaseType | string,
): string {
  if (releaseType === 'custom') {
    return currentVersion
  }

  if (['patch', 'minor', 'major'].includes(releaseType)) {
    return (
      semver.inc(currentVersion, releaseType as 'patch' | 'minor' | 'major') ??
      currentVersion
    )
  }

  // 已经是完整版本号
  if (semver.valid(releaseType)) {
    return releaseType
  }

  return currentVersion
}

/**
 * 验证版本号是否合法
 */
export function isValidVersion(version: string): boolean {
  return semver.valid(version) !== null
}
```

- [ ] **Step 2: 更新 index.ts 导出**

```typescript
export { calculateNewVersion, isValidVersion } from './version'
```

- [ ] **Step 3: Commit**

```bash
git add packages/release/src/version.ts packages/release/src/index.ts
git commit -m "feat(release): add version calculation"
```

---

## Phase 2: CLI 重构

### Task 5: 创建 cli/ 新目录结构

**Files:**

- Create: `packages/cli/src/commands/`
- Create: `packages/cli/src/scaffold/`
- Create: `packages/cli/src/scaffold/fs/`
- Create: `packages/cli/src/prompts/`
- Create: `packages/cli/src/options/`
- Create: `packages/cli/src/utils/`

- [ ] **Step 1: 创建目录结构（mkdir -p 命令）**

```bash
mkdir -p packages/cli/src/commands
mkdir -p packages/cli/src/scaffold/fs
mkdir -p packages/cli/src/prompts
mkdir -p packages/cli/src/options
mkdir -p packages/cli/src/utils
```

- [ ] **Step 2: Commit**

```bash
git add packages/cli/src/
git commit -m "feat(cli): create new directory structure"
```

---

### Task 6: 创建 cli/src/scaffold/types.ts

**Files:**

- Create: `packages/cli/src/scaffold/types.ts`

- [ ] **Step 1: 创建脚手架类型定义**

```typescript
// Scaffold 配置
export interface ScaffoldOptions {
  projectName: string
  template: string
  targetDir: string
  force?: boolean
}

// 下载选项
export interface DownloadOptions {
  url: string
  target: string
}

// 验证结果
export interface ValidationResult {
  valid: boolean
  error?: string
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/cli/src/scaffold/types.ts
git commit -m "feat(cli): add scaffold type definitions"
```

---

### Task 7: 创建 cli/src/scaffold/fs/ (文件系统操作)

**Files:**

- Create: `packages/cli/src/scaffold/fs/empty.ts`
- Create: `packages/cli/src/scaffold/fs/copy.ts`
- Create: `packages/cli/src/scaffold/fs/write.ts`
- Create: `packages/cli/src/scaffold/fs/index.ts`

- [ ] **Step 1: 创建 fs/empty.ts**

```typescript
import { readdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'

/**
 * 检查目录是否为空（无文件或只有 .git）
 */
export function isEmpty(dir: string): boolean {
  const files = readdirSync(dir)
  return files.length === 0 || (files.length === 1 && files[0] === '.git')
}

/**
 * 清空目录（删除所有文件但保留 .git）
 */
export function emptyDir(dir: string): void {
  const files = readdirSync(dir)
  for (const file of files) {
    if (file === '.git') continue
    rmSync(join(dir, file), { recursive: true, force: true })
  }
}
```

- [ ] **Step 2: 创建 fs/copy.ts**

```typescript
import { copyFileSync, mkdirSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

/**
 * 复制文件
 */
export function copyFile(src: string, dest: string): void {
  copyFileSync(src, dest)
}

/**
 * 递归复制目录
 */
export function copyDir(src: string, dest: string): void {
  mkdirSync(dest, { recursive: true })
  const entries = readdirSync(src, { withFileTypes: true })

  for (const entry of entries) {
    const srcPath = join(src, entry.name)
    const destPath = join(dest, entry.name)

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath)
    } else {
      copyFileSync(srcPath, destPath)
    }
  }
}
```

- [ ] **Step 3: 创建 fs/write.ts**

```typescript
import { writeFileSync } from 'node:fs'

/**
 * 写入文件
 */
export function writeFile(file: string, content: string): void {
  writeFileSync(file, content, 'utf-8')
}
```

- [ ] **Step 4: 创建 fs/index.ts**

```typescript
export { isEmpty, emptyDir } from './empty'
export { copyFile, copyDir } from './copy'
export { writeFile } from './write'
```

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/scaffold/fs/
git commit -m "feat(cli): add scaffold filesystem utilities"
```

---

### Task 8: 创建 cli/src/scaffold/validators.ts

**Files:**

- Create: `packages/cli/src/scaffold/validators.ts`

- [ ] **Step 1: 创建 validators.ts**

```typescript
import { existsSync } from 'node:fs'
import { dirname } from 'node:path'
import { isEmpty } from './fs/empty'

/**
 * 验证项目名是否合法
 */
export function validateProjectName(name: string): boolean {
  if (!name) return false

  // NPM 包名规则: @scope/name 或 name
  const namePattern = /^(?:@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/
  return namePattern.test(name)
}

/**
 * 验证目标目录
 */
export function validateTargetDir(
  targetDir: string,
  force: boolean = false,
): { valid: boolean; error?: string } {
  if (!existsSync(targetDir)) {
    return { valid: true }
  }

  if (!isEmpty(targetDir)) {
    if (force) {
      return { valid: true }
    }
    return { valid: false, error: '目标目录不为空，请使用 --force 覆盖' }
  }

  return { valid: true }
}

/**
 * 格式化目标目录路径
 */
export function formatTargetDir(targetDir: string): string {
  // 移除末尾的 /
  return targetDir.replace(/\/$/, '')
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/cli/src/scaffold/validators.ts
git commit -m "feat(cli): add scaffold validators"
```

---

### Task 9: 创建 cli/src/scaffold/download.ts

**Files:**

- Create: `packages/cli/src/scaffold/download.ts`

- [ ] **Step 1: 创建 download.ts**

```typescript
import { createWriteStream } from 'node:fs'
import { mkdirSync } from 'node:fs'
import { pipeline } from 'node:stream/promises'
import { promisify } from 'node:util'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'
import { tmpdir } from 'node:os'

const exec = promisify(execSync)

/**
 * 下载远程模板
 */
export async function downloadTemplate(
  url: string,
  target: string,
): Promise<void> {
  const tmp = tmpdir()
  const tmpPath = `${tmp}/scaffold-${Date.now()}`

  // Git clone
  execSync(`git clone --depth 1 ${url} ${tmpPath}`, { stdio: 'pipe' })

  // 移动文件到目标
  const { copyDir } = await import('./fs/copy')
  copyDir(tmpPath, target)

  // 清理临时目录
  execSync(`rm -rf ${tmpPath}`)
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/cli/src/scaffold/download.ts
git commit -m "feat(cli): add download template functionality"
```

---

### Task 10: 创建 cli/src/scaffold/scaffold.ts

**Files:**

- Create: `packages/cli/src/scaffold/scaffold.ts`
- Create: `packages/cli/src/scaffold/index.ts`

- [ ] **Step 1: 创建 scaffold.ts**

```typescript
import {
  formatTargetDir,
  validateProjectName,
  validateTargetDir,
} from './validators'
import { downloadTemplate } from './download'
import { emptyDir } from './fs/empty'
import { isEmpty } from './fs/empty'
import { copyDir } from './fs/copy'
import type { ScaffoldOptions } from './types'

/**
 * 脚手架主逻辑
 */
export async function scaffold(options: ScaffoldOptions): Promise<void> {
  const { projectName, template, targetDir, force = false } = options

  // 格式化路径
  const formattedTargetDir = formatTargetDir(targetDir)

  // 验证项目名
  if (!validateProjectName(projectName)) {
    throw new Error(`无效的项目名: ${projectName}`)
  }

  // 验证目标目录
  const validation = validateTargetDir(formattedTargetDir, force)
  if (!validation.valid) {
    throw new Error(validation.error)
  }

  // 如果目录存在且不为空，先清空
  if (!isEmpty(formattedTargetDir)) {
    emptyDir(formattedTargetDir)
  }

  // 下载模板
  await downloadTemplate(template, formattedTargetDir)

  console.log(`✅ 项目 ${projectName} 已创建在 ${formattedTargetDir}`)
}
```

- [ ] **Step 2: 创建 scaffold/index.ts**

```typescript
export { scaffold } from './scaffold'
export { downloadTemplate } from './download'
export {
  validateProjectName,
  validateTargetDir,
  formatTargetDir,
} from './validators'
export type {
  ScaffoldOptions,
  DownloadOptions,
  ValidationResult,
} from './types'
```

- [ ] **Step 3: Commit**

```bash
git add packages/cli/src/scaffold/scaffold.ts packages/cli/src/scaffold/index.ts
git commit -m "feat(cli): add scaffold main logic"
```

---

### Task 11: 创建 cli/src/prompts/ (交互式 prompts)

**Files:**

- Create: `packages/cli/src/prompts/project.ts`
- Create: `packages/cli/src/prompts/template.ts`
- Create: `packages/cli/src/prompts/index.ts`

- [ ] **Step 1: 创建 prompts/project.ts**

```typescript
import prompts from 'prompts'
import { validateProjectName } from '../scaffold/validators'

/**
 * 询问项目名
 */
export async function promptProjectName(): Promise<string> {
  const { name } = await prompts({
    type: 'text',
    name: 'name',
    message: '项目名称:',
    validate: (value: string) =>
      validateProjectName(value) || '无效的项目名（需符合 NPM 包名规范）',
  })

  return name
}
```

- [ ] **Step 2: 创建 prompts/template.ts**

```typescript
import prompts from 'prompts'

// 内置模板列表
export const BUILTIN_TEMPLATES = [
  {
    name: 'vue',
    value: 'github:vfiee/template-vue',
    description: 'Vue 3 + Vite',
  },
  {
    name: 'react',
    value: 'github:vfiee/template-react',
    description: 'React 18 + Vite',
  },
  {
    name: 'node',
    value: 'github:vfiee/template-node',
    description: 'Node.js CLI',
  },
]

/**
 * 询问模板选择
 */
export async function promptTemplate(): Promise<string> {
  const { template } = await prompts({
    type: 'select',
    name: 'template',
    message: '选择模板:',
    choices: BUILTIN_TEMPLATES.map((t) => ({
      value: t.value,
      title: `${t.name} - ${t.description}`,
    })),
  })

  return template
}
```

- [ ] **Step 3: 创建 prompts/index.ts**

```typescript
export { promptProjectName } from './project'
export { promptTemplate, BUILTIN_TEMPLATES } from './template'
```

- [ ] **Step 4: Commit**

```bash
git add packages/cli/src/prompts/
git commit -m "feat(cli): add interactive prompts"
```

---

### Task 12: 创建 cli/src/commands/ (命令定义)

**Files:**

- Create: `packages/cli/src/commands/init.ts`
- Create: `packages/cli/src/commands/release.ts`
- Create: `packages/cli/src/commands/index.ts`

- [ ] **Step 1: 创建 commands/init.ts**

```typescript
import { scaffold } from '../scaffold'
import { promptProjectName, promptTemplate } from '../prompts'
import { formatTargetDir } from '../scaffold/validators'

export interface InitOptions {
  projectName?: string
  template?: string
  targetDir?: string
  force?: boolean
}

export const initCommand = {
  name: 'init',
  description: '创建新项目',

  async action(options: InitOptions): Promise<void> {
    // 1. 收集用户输入
    const projectName = options.projectName ?? (await promptProjectName())
    const template = options.template ?? (await promptTemplate())
    const targetDir = options.targetDir ?? formatTargetDir(`./${projectName}`)
    const force = options.force ?? false

    // 2. 执行脚手架
    await scaffold({
      projectName,
      template,
      targetDir,
      force,
    })
  },
}
```

- [ ] **Step 2: 创建 commands/release.ts**

```typescript
import { release } from '../../release'
import type { ReleaseOptions } from '../../release'

export interface ReleaseCommandOptions extends ReleaseOptions {}

export const releaseCommand = {
  name: 'release',
  description: '发布新版本（类似 bumpp）',

  async action(options: ReleaseCommandOptions): Promise<void> {
    await release(options)
  },
}
```

- [ ] **Step 3: 创建 commands/index.ts**

```typescript
export { initCommand } from './init'
export type { InitOptions } from './init'
export { releaseCommand } from './release'
export type { ReleaseCommandOptions } from './release'
```

- [ ] **Step 4: Commit**

```bash
git add packages/cli/src/commands/
git commit -m "feat(cli): add command definitions"
```

---

### Task 13: 创建 cli/src/utils/ (通用工具)

**Files:**

- Create: `packages/cli/src/utils/logger.ts`
- Create: `packages/cli/src/utils/register.ts`
- Create: `packages/cli/src/utils/index.ts`

- [ ] **Step 1: 创建 utils/logger.ts**

```typescript
export const logger = {
  info(message: string): void {
    console.log(`ℹ️  ${message}`)
  },
  success(message: string): void {
    console.log(`✅ ${message}`)
  },
  error(message: string): void {
    console.error(`❌ ${message}`)
  },
  warn(message: string): void {
    console.warn(`⚠️  ${message}`)
  },
}
```

- [ ] **Step 2: 创建 utils/register.ts**

```typescript
import { initCommand } from '../commands/init'
import { releaseCommand } from '../commands/release'

interface Command {
  name: string
  description: string
  action: (options: unknown) => Promise<void>
}

const commands: Command[] = [initCommand, releaseCommand]

/**
 * 注册命令并执行
 */
export async function register(args: string[]): Promise<void> {
  const [commandName, ...restArgs] = args.slice(2) // 跳过 node 和脚本路径

  const command = commands.find((c) => c.name === commandName)

  if (!command) {
    console.log('可用命令:')
    for (const cmd of commands) {
      console.log(`  ${cmd.name} - ${cmd.description}`)
    }
    return
  }

  try {
    await command.action({})
  } catch (error) {
    console.error(`命令执行失败: ${error}`)
    process.exit(1)
  }
}

export { register }
```

- [ ] **Step 3: 创建 utils/index.ts**

```typescript
export { logger } from './logger'
export { register } from './register'
```

- [ ] **Step 4: Commit**

```bash
git add packages/cli/src/utils/
git commit -m "feat(cli): add utility modules"
```

---

### Task 14: 重构 cli/src/index.ts (入口文件)

**Files:**

- Modify: `packages/cli/src/index.ts`

- [ ] **Step 1: 读取现有 index.ts**

```bash
cat packages/cli/src/index.ts
```

- [ ] **Step 2: 替换为新入口**

```typescript
import { register } from './utils/register'

// 从命令行参数启动
const args = process.argv
register(args)
```

- [ ] **Step 3: Commit**

```bash
git add packages/cli/src/index.ts
git commit -m "feat(cli): refactor entry point"
```

---

## Phase 3: 发布流水线

### Task 15: 创建 release/src/git.ts

**Files:**

- Create: `packages/release/src/git.ts`

- [ ] **Step 1: 创建 git.ts**

```typescript
import { execSync } from 'node:child_process'

/**
 * 执行 git 命令
 */
function execGit(args: string): string {
  return execSync(`git ${args}`, { encoding: 'utf-8', stdio: 'pipe' })
}

/**
 * 检查是否有未提交的更改
 */
export function hasUncommittedChanges(): boolean {
  try {
    const status = execGit('status --porcelain')
    return status.trim().length > 0
  } catch {
    return false
  }
}

/**
 * Git add
 */
export function gitAdd(files: string = '.'): void {
  execGit(`add ${files}`)
}

/**
 * Git commit
 */
export function gitCommit(message: string): void {
  execGit(`commit -m "${message}"`)
}

/**
 * Git tag
 */
export function gitTag(tag: string): void {
  execGit(`tag ${tag}`)
}

/**
 * Git push
 */
export function gitPush(): void {
  execSync('git push', { stdio: 'pipe' })
}

/**
 * Git push with tags
 */
export function gitPushTags(): void {
  execSync('git push --tags', { stdio: 'pipe' })
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/release/src/git.ts
git commit -m "feat(release): add git operations"
```

---

### Task 16: 创建 release/src/npm.ts

**Files:**

- Create: `packages/release/src/npm.ts`

- [ ] **Step 1: 创建 npm.ts**

```typescript
import { execSync } from 'node:child_process'

/**
 * NPM 发布
 */
export function npmPublish(cwd: string): void {
  execSync('npm publish', {
    cwd,
    stdio: 'inherit',
  })
}

/**
 * 检查是否登录 npm
 */
export function isNpmLoggedIn(): boolean {
  try {
    execSync('npm whoami', { stdio: 'pipe' })
    return true
  } catch {
    return false
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/release/src/npm.ts
git commit -m "feat(release): add npm operations"
```

---

### Task 17: 创建 release/src/prompts.ts (交互式发布选择)

**Files:**

- Create: `packages/release/src/prompts.ts`

- [ ] **Step 1: 创建 prompts.ts**

```typescript
import prompts from 'prompts'
import { calculateNewVersion } from './version'
import type { ReleaseType } from './types'

/**
 * 交互式选择发布类型
 */
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
      { value: 'patch', title: `Patch (bugfix) → ${versions.patch}` },
      { value: 'minor', title: `Minor (新功能) → ${versions.minor}` },
      { value: 'major', title: `Major (破坏性更新) → ${versions.major}` },
      { value: 'custom', title: '自定义版本' },
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

- [ ] **Step 2: Commit**

```bash
git add packages/release/src/prompts.ts
git commit -m "feat(release): add interactive release prompts"
```

---

### Task 18: 创建 release/src/steps/ (发布步骤)

**Files:**

- Create: `packages/release/src/steps/check-git.ts`
- Create: `packages/release/src/steps/bump-version.ts`
- Create: `packages/release/src/steps/commit.ts`
- Create: `packages/release/src/steps/push.ts`
- Create: `packages/release/src/steps/publish.ts`
- Create: `packages/release/src/steps/index.ts`

- [ ] **Step 1: 创建 steps/check-git.ts**

```typescript
import { hasUncommittedChanges } from '../git'

/**
 * 检查 Git 状态
 */
export function checkGitStatus(): void {
  if (hasUncommittedChanges()) {
    throw new Error('有未提交的更改，请先提交后再发布')
  }
}
```

- [ ] **Step 2: 创建 steps/bump-version.ts**

```typescript
import { readPkg, writePkg } from '../pkg'
import { calculateNewVersion } from '../version'
import type { ReleaseType } from '../types'

/**
 * 更新版本号
 */
export function bumpVersion(
  cwd: string,
  releaseType: ReleaseType | string,
): string {
  const pkg = readPkg(cwd)
  const newVersion = calculateNewVersion(pkg.version, releaseType)
  writePkg(cwd, newVersion)
  return newVersion
}
```

- [ ] **Step 3: 创建 steps/commit.ts**

```typescript
import { gitAdd, gitCommit, gitTag } from '../git'

/**
 * 提交并打标签
 */
export function commitAndTag(cwd: string, newVersion: string): void {
  gitAdd('.')
  gitCommit(`release: ${newVersion}`)
  gitTag(`v${newVersion}`)
}
```

- [ ] **Step 4: 创建 steps/push.ts**

```typescript
import { gitPush, gitPushTags } from '../git'

/**
 * 推送到远程
 */
export function pushToRemote(): void {
  gitPush()
  gitPushTags()
}
```

- [ ] **Step 5: 创建 steps/publish.ts**

```typescript
import { npmPublish } from '../npm'

/**
 * 发布到 NPM
 */
export function publishToNpm(cwd: string): void {
  npmPublish(cwd)
}
```

- [ ] **Step 6: 创建 steps/index.ts**

```typescript
export { checkGitStatus } from './check-git'
export { bumpVersion } from './bump-version'
export { commitAndTag } from './commit'
export { pushToRemote } from './push'
export { publishToNpm } from './publish'
```

- [ ] **Step 7: Commit**

```bash
git add packages/release/src/steps/
git commit -m "feat(release): add release steps"
```

---

### Task 19: 创建 release/src/run.ts (主流水线)

**Files:**

- Create: `packages/release/src/run.ts`

- [ ] **Step 1: 创建 run.ts**

```typescript
import { readPkg, writePkg } from './pkg'
import { calculateNewVersion } from './version'
import { promptReleaseType } from './prompts'
import { checkGitStatus } from './steps/check-git'
import { commitAndTag } from './steps/commit'
import { pushToRemote } from './steps/push'
import { publishToNpm } from './steps/publish'
import type { ReleaseOptions } from './types'

/**
 * 主流水线
 */
export async function run(options: ReleaseOptions = {}): Promise<void> {
  const cwd = options.cwd ?? process.cwd()

  // 1. 检查 Git 状态
  checkGitStatus()

  // 2. 读取当前版本
  const pkg = readPkg(cwd)
  console.log(`📦 当前版本: ${pkg.name}@${pkg.version}`)

  // 3. 计算新版本
  const releaseType =
    options.releaseAs ?? (await promptReleaseType(pkg.version))
  const newVersion = calculateNewVersion(pkg.version, releaseType)
  console.log(`🚀 版本更新: ${pkg.version} → ${newVersion}`)

  // 4. 更新 package.json
  writePkg(cwd, newVersion)

  if (options.dryRun) {
    console.log('🔍 DryRun 模式，未实际执行')
    return
  }

  // 5. Git commit & tag
  console.log('📝 Git commit & tag...')
  commitAndTag(cwd, newVersion)

  // 6. Git push
  if (!options.skipPush) {
    console.log('🚀 Git push...')
    pushToRemote()
  }

  // 7. NPM publish
  if (!options.skipPublish) {
    console.log('📦 NPM publishing...')
    publishToNpm(cwd)
  }

  console.log(`✅ 发布完成: ${pkg.name}@${newVersion}`)
}
```

- [ ] **Step 2: 更新 index.ts 使用 run**

```typescript
import { run } from './run'
import type { ReleaseOptions } from './types'

export async function release(options: ReleaseOptions = {}): Promise<void> {
  await run(options)
}

export { run }
export type { ReleaseOptions } from './types'
export { readPkg, writePkg } from './pkg'
export { calculateNewVersion, isValidVersion } from './version'
```

- [ ] **Step 3: Commit**

```bash
git add packages/release/src/run.ts packages/release/src/index.ts
git commit -m "feat(release): add main release pipeline"
```

---

## Phase 4: 清理与文档

### Task 20: 删除 ui/ 包

**Files:**

- Delete: `packages/ui/` (entire directory)

- [ ] **Step 1: 删除 ui 目录**

```bash
rm -rf packages/ui
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "chore: remove ui package (no source code)"
```

---

### Task 21: 删除 use-axios/ 包

**Files:**

- Delete: `packages/use-axios/` (entire directory)

- [ ] **Step 1: 删除 use-axios 目录**

```bash
rm -rf packages/use-axios
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "chore: remove use-axios package (not in toolchain scope)"
```

---

### Task 22: 合并 release-scripts 到 release/

**Files:**

- Read: `packages/release-scripts/src/` files
- Modify: `packages/release/src/` files to incorporate release-scripts logic
- Delete: `packages/release-scripts/`

- [ ] **Step 1: 读取 release-scripts 源码**

```bash
ls -la packages/release-scripts/src/
cat packages/release-scripts/src/*.ts
```

- [ ] **Step 2: 将 release-scripts 的 Changelog 生成逻辑合并到 release/src/changelog.ts**

```typescript
// packages/release/src/changelog.ts
// 合并现有的 changelog 相关逻辑
```

- [ ] **Step 3: 更新 index.ts 导出**

- [ ] **Step 4: 删除 release-scripts**

```bash
rm -rf packages/release-scripts
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: merge release-scripts into release package"
```

---

### Task 23: 创建各包 README

**Files:**

- Create: `packages/cli/README.md`
- Create: `packages/release/README.md`
- Create: `packages/utils/README.md`

- [ ] **Step 1: 创建 packages/cli/README.md**

````markdown
# @vyron/cli

> VII 工具链 CLI 入口

## Install

```bash
pnpm add -g @vyron/cli
```
````

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
vyron init my-app --template vue
```

### release

一键发布（类似 bumpp）。

```bash
vyron release
vyron release --dry-run
vyron release --release-as minor
```

````

- [ ] **Step 2: 创建 packages/release/README.md**

```markdown
# @vyron/release

> 一键发布流水线

## Install

```bash
pnpm add @vyron/release
````

## Usage

```typescript
import { release } from '@vyron/release'

await release({
  cwd: process.cwd(),
  dryRun: true,
})
```

````

- [ ] **Step 3: 创建 packages/utils/README.md**

```markdown
# @vyron/utils

> 通用工具函数

## Install

```bash
pnpm add @vyron/utils
````

## Usage

```typescript
import { getStorage, setStorage } from '@vyron/utils'

setStorage('key', 'value')
const value = getStorage('key')
```

````

- [ ] **Step 4: Commit**

```bash
git add packages/*/README.md
git commit -m "docs: add README for each package"
````

---

### Task 24: 更新 workspace 配置

**Files:**

- Modify: `pnpm-workspace.yaml`
- Modify: `package.json` (scripts)

- [ ] **Step 1: 检查并更新 pnpm-workspace.yaml**

```yaml
packages:
  - 'packages/*'
```

- [ ] **Step 2: Commit**

```bash
git add pnpm-workspace.yaml
git commit -m "chore: update workspace configuration"
```

---

### Task 25: 构建和类型检查

- [ ] **Step 1: 安装依赖**

```bash
pnpm install
```

- [ ] **Step 2: 构建所有包**

```bash
pnpm build
```

- [ ] **Step 3: 类型检查**

```bash
pnpm typecheck
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: build and typecheck all packages"
```

---

## 验收检查

完成所有任务后，验证以下标准：

- [ ] `packages/cli/src/` 代码行数 < 400 行
- [ ] `packages/cli/src/scaffold/` 和 `packages/cli/src/prompts/` 模块化清晰
- [ ] `packages/release/` 支持从 package.json 读取版本
- [ ] `packages/release/` 支持一键发布
- [ ] 所有包 100% TypeScript，无 any
- [ ] 所有包有完整类型导出
- [ ] 每个包有 README
- [ ] `pnpm build` 成功
- [ ] `pnpm typecheck` 通过
- [ ] `packages/ui/` 已删除
- [ ] `packages/use-axios/` 已删除
