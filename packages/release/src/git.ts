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
 * 检查是否有 remote
 */
export function hasRemote(): boolean {
  try {
    const remote = execGit("remote get-url origin");
    return remote.trim().length > 0;
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
  } catch {
    throw new Error("git add 失败，请检查文件权限");
  }
}

/**
 * Git commit
 */
export function gitCommit(message: string): void {
  try {
    execGit(`commit -m "${message}"`);
  } catch {
    throw new Error("git commit 失败，请确认已配置用户名和邮箱");
  }
}

/**
 * Git tag
 */
export function gitTag(tag: string): void {
  try {
    execGit(`tag ${tag}`);
  } catch {
    throw new Error("git tag 失败，标签名可能已存在");
  }
}

/**
 * Git push
 */
export function gitPush(): void {
  try {
    execSync("git push", { stdio: "pipe" });
  } catch {
    throw new Error("git push 失败，请检查网络或 remote 配置");
  }
}

/**
 * Git push with tags
 */
export function gitPushTags(): void {
  try {
    execSync("git push --tags", { stdio: "pipe" });
  } catch {
    throw new Error("git push --tags 失败，请检查网络或 remote 配置");
  }
}
