import { gitAdd, gitCommit, gitTag } from "../git";

/**
 * 提交并打标签
 */
export function commitAndTag(_cwd: string, newVersion: string, commitMessage: string): void {
  gitAdd(".");
  gitCommit(commitMessage);
  gitTag(`v${newVersion}`);
}
