import { execSync } from "node:child_process";

/**
 * 检查 npm 版本是否已存在
 */
export function npmVersionExists(pkgName: string, version: string): boolean {
  try {
    execSync(`npm view ${pkgName}@${version} version`, { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

/**
 * 带重试的 NPM 发布
 */
export function npmPublish(cwd: string, retries = 3): void {
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`📦 正在发布到 npm (${i + 1}/${retries})...`);
      execSync("npm publish", {
        cwd,
        stdio: "inherit",
      });
      console.log(`✅ npm publish 完成 (${i + 1}/${retries})\n`);
      return;
    } catch {
      if (i === retries - 1) {
        throw new Error("npm publish 失败，请确认已登录 npm（npm login）");
      }
      console.log(`⚠️  npm publish 失败，${i + 1} 秒后重试...\n`);
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
 * 检查是否登录 npm
 */
export function isNpmLoggedIn(): boolean {
  try {
    execSync("npm whoami", { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}
