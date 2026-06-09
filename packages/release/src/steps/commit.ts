import { gitAdd, gitCommit, gitTag } from '../git'

/**
 * 提交并打标签
 */
export function commitAndTag(_cwd: string, newVersion: string): void {
  gitAdd('.')
  gitCommit(`release: ${newVersion}`)
  gitTag(`v${newVersion}`)
}
