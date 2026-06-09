import { execSync } from "node:child_process";
import { tmpdir } from "node:os";

/**
 * 下载远程模板
 */
export async function downloadTemplate(url: string, target: string): Promise<void> {
  const tmp = tmpdir();
  const tmpPath = `${tmp}/scaffold-${Date.now()}`;

  // Git clone
  execSync(`git clone --depth 1 ${url} ${tmpPath}`, { stdio: "pipe" });

  // 移动文件到目标
  const { copyDir } = await import("./fs/copy");
  copyDir(tmpPath, target);

  // 清理临时目录
  execSync(`rm -rf ${tmpPath}`);
}
