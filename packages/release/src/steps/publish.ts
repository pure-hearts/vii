import { npmPublish } from '../npm'

/**
 * 发布到 NPM
 */
export function publishToNpm(cwd: string): void {
  npmPublish(cwd)
}
