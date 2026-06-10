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
 * NPM 发布
 */
export function npmPublish(cwd: string): void {
  try {
    console.log("📦 正在发布到 npm...");
    execSync("npm publish", {
      cwd,
      stdio: "inherit",
    });
  } catch {
    throw new Error("npm publish 失败，请确认已登录 npm（npm login）");
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
