import { hasUncommittedChanges } from '../git'

/**
 * 检查 Git 状态
 */
export function checkGitStatus(): void {
  if (hasUncommittedChanges()) {
    throw new Error('有未提交的更改，请先提交后再发布')
  }
}
