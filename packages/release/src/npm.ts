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
