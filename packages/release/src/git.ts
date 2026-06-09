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
