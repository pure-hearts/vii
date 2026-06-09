import { execSync } from "node:child_process";
import { tmpdir } from "node:os";

/**
 * 下载远程模板
 */
export async function downloadTemplate(url: string, target: string): Promise<void> {
  const tmp = tmpdir();
  const tmpPath = `${tmp}/scaffold-${Date.now()}`;

  // 转换 github 短协议，例如: github:vfiee/template-vue -> https://github.com/vfiee/template-vue.git
  let gitUrl = url;
  if (url.startsWith("github:")) {
    const repository = url.slice(7); // 去掉 "github:"
    gitUrl = `https://github.com/${repository}.git`;
  }

  try {
    // Git clone 模板仓库
    execSync(`git clone --depth 1 ${gitUrl} ${tmpPath}`, { stdio: "pipe" });

    // 移动文件到目标目录
    const { copyDir } = await import("./fs/copy");
    copyDir(tmpPath, target);
  } catch (error: any) {
    throw new Error(
      `下载模版失败。\n1. 请检查您的网络连接或代理设置；\n2. 请确保已在本地安装 git 命令；\n3. 请确认模板仓库地址有效 (${gitUrl})。\n\n具体错误: ${error.message || error}`,
    );
  } finally {
    // 确保清理临时目录
    try {
      execSync(`rm -rf ${tmpPath}`);
    } catch {
      // 忽略清理临时目录本身的异常
    }
  }
}
