import { execSync } from "node:child_process";

/**
 * 执行 git 命令
 */
function execGit(args: string): string {
  return execSync(`git ${args}`, { encoding: "utf-8", stdio: "pipe" });
}

/**
 * 带进度提示执行 git 命令
 */
function execGitWithSpinner(args: string, message: string): string {
  process.stdout.write(`⏳ ${message}...`);
  const start = Date.now();
  try {
    const result = execSync(`git ${args}`, { encoding: "utf-8", stdio: "pipe" });
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`\r✅ ${message} (${elapsed}s)\n`);
    return result;
  } catch (error) {
    console.log(`\r❌ ${message} 失败\n`);
    throw error;
  }
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
 * 带重试的 Git push
 */
export function gitPush(retries = 3): void {
  for (let i = 0; i < retries; i++) {
    try {
      execGitWithSpinner("push", `Git push (${i + 1}/${retries})`);
      return;
    } catch {
      if (i === retries - 1) {
        throw new Error("git push 失败，请检查网络或 remote 配置");
      }
      console.log(`⚠️  push 失败，${i + 1} 秒后重试...\n`);
      sleep(i + 1);
    }
  }
}

/**
 * 带重试的 Git push --tags
 */
export function gitPushTags(retries = 3): void {
  for (let i = 0; i < retries; i++) {
    try {
      execGitWithSpinner("push --tags", `Git push tags (${i + 1}/${retries})`);
      return;
    } catch {
      if (i === retries - 1) {
        throw new Error("git push --tags 失败，请检查网络或 remote 配置");
      }
      console.log(`⚠️  push --tags 失败，${i + 1} 秒后重试...\n`);
      sleep(i + 1);
    }
  }
}

/**
 * 带重试的 Git push --follow-tags
 */
export function gitPushWithTags(retries = 3): void {
  for (let i = 0; i < retries; i++) {
    try {
      execGitWithSpinner("push --follow-tags", `Git push with tags (${i + 1}/${retries})`);
      return;
    } catch {
      if (i === retries - 1) {
        throw new Error("git push --follow-tags 失败，请检查网络或 remote 配置");
      }
      console.log(`⚠️  push --follow-tags 失败，${i + 1} 秒后重试...\n`);
      sleep(i + 1);
    }
  }
}

function sleep(seconds: number): void {
  const end = Date.now() + seconds * 1000;
  while (Date.now() < end) {
    // busy wait
  }
}

/**
 * 本地删除 Tag
 */
export function gitDeleteTag(tag: string): void {
  try {
    execGit(`tag -d ${tag}`);
  } catch (error) {
    throw new Error(`本地删除 Tag 失败: ${tag}`);
  }
}

/**
 * 本地 Reset Hard
 */
export function gitResetHard(target: string): void {
  try {
    execGit(`reset --hard ${target}`);
  } catch (error) {
    throw new Error(`本地 reset --hard 失败: ${target}`);
  }
}

/**
 * 远端删除 Tag
 */
export function gitDeleteRemoteTag(tag: string): void {
  try {
    execGit(`push origin :refs/tags/${tag}`);
  } catch (error) {
    throw new Error(`从远端删除 Tag 失败: ${tag}`);
  }
}
