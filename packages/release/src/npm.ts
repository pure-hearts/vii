import { execSync } from "node:child_process";

/**
 * NPM 发布
 */
export function npmPublish(cwd: string): void {
  try {
    execSync("npm publish", {
      cwd,
      stdio: "inherit",
    });
  } catch (error: any) {
    throw new Error(
      `npm publish 发布失败，请检查以下内容：\n1. 您是否已正确登录 npm 镜像源？\n2. 您的 package.json 版本号 (${cwd}) 是否已经存在？\n3. 您的网络是否连接稳定？\n\n具体错误: ${error.message || error}`,
    );
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
