import { gitPush, gitPushTags } from "../git";

/**
 * 推送到远程
 */
export function pushToRemote(): void {
  gitPush();
  gitPushTags();
}
