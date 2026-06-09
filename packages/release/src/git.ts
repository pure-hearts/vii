import { execSync } from "node:child_process";

/**
 * 执行 git 命令
 */
function execGit(args: string): string {
  return execSync(`git ${args}`, { encoding: "utf-8", stdio: "pipe" });
}

/**
 * 校验当前是否是 Git 仓库
 */
export function isGitRepository(): boolean {
  try {
    execSync("git rev-parse --is-inside-work-tree", { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

/**
 * 检查是否有未提交的更改
 */
export function hasUncommittedChanges(): boolean {
  try {
    if (!isGitRepository()) return false;
    const status = execGit("status --porcelain");
    return status.trim().length > 0;
  } catch {
    return false;
  }
}

/**
 * Git add
 */
export function gitAdd(files: string = "."): void {
  try {
    execGit(`add ${files}`);
  } catch (error: any) {
    throw new Error(`Git add 失败 (文件: "${files}"): ${error.message || error}`);
  }
}

/**
 * Git commit
 */
export function gitCommit(message: string): void {
  try {
    execGit(`commit -m "${message}"`);
  } catch (error: any) {
    throw new Error(`Git commit 失败 (消息: "${message}"): ${error.message || error}`);
  }
}

/**
 * Git tag
 */
export function gitTag(tag: string): void {
  try {
    execGit(`tag ${tag}`);
  } catch (error: any) {
    throw new Error(`Git tag 失败 (标签: "${tag}"): ${error.message || error}`);
  }
}

/**
 * Git push
 */
export function gitPush(): void {
  try {
    execSync("git push", { stdio: "pipe" });
  } catch (error: any) {
    throw new Error(`Git push 失败，请检查远程仓库连接与推送权限: ${error.message || error}`);
  }
}

/**
 * Git push with tags
 */
export function gitPushTags(): void {
  try {
    execSync("git push --tags", { stdio: "pipe" });
  } catch (error: any) {
    throw new Error(`Git push --tags 推送标签失败: ${error.message || error}`);
  }
}
