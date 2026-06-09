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
