import { execSync, spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { createCloneSpinner } from "../utils/spinner";

/**
 * 应用 GitHub 镜像地址转换
 */
export function applyGithubMirror(gitUrl: string, mirror: string): string {
  if (!mirror) return gitUrl;

  const normalizedMirror = mirror.trim().replace(/\/$/, "");

  // GitClone 镜像特殊路径规则
  if (normalizedMirror.includes("gitclone.com")) {
    const repoPath = gitUrl.replace(/^https:\/\/github\.com\//, "");
    return `https://gitclone.com/github.com/${repoPath}`;
  }

  // 默认域名替换 (如 kkgithub.com)
  if (gitUrl.startsWith("https://github.com")) {
    const mirrorWithProto = normalizedMirror.startsWith("http")
      ? normalizedMirror
      : `https://${normalizedMirror}`;
    return gitUrl.replace("https://github.com", mirrorWithProto);
  }

  return gitUrl;
}

// 提取仓库名（owner/repo）的辅助函数
export function getRepoLabel(gitUrl: string): string {
  const cleanUrl = gitUrl.replace(/\.git$/, "").replace(/\/$/, "");
  const match = cleanUrl.match(/[:/]([^/]+)\/([^/]+)$/);
  if (match) {
    return `${match[1]}/${match[2]}`;
  }
  return "项目模板";
}

// 提取镜像源名称的辅助函数
export function getMirrorName(mirror?: string): string {
  if (!mirror) return "官方源";
  try {
    const url = new URL(mirror);
    const host = url.hostname;
    if (host.includes("kkgithub.com")) return "KKGitHub";
    if (host.includes("gitclone.com")) return "GitClone";
    return host;
  } catch {
    return mirror;
  }
}

/**
 * 异步克隆核心 Promise 包装器
 */
async function runClone(
  cloneCmd: string,
  spinner: ReturnType<typeof createCloneSpinner>,
  tmpPath: string,
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(cloneCmd, { shell: true });

    // 45 秒超时限制
    const timeoutId = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("Git 克隆操作超时（限时 45 秒）。请检查网络连接或更换镜像源。"));
    }, 45000);

    const stderrBuffers: Buffer[] = [];

    child.stderr.on("data", (chunk: Buffer) => {
      stderrBuffers.push(chunk);
      const output = chunk.toString();

      // 正则提取百分比
      const pctMatch = output.match(/(\d+)%/);
      // 正则提取已下载大小和网速，如 "1.20 MiB | 250.00 KiB/s"
      const metricsMatch = output.match(
        /([\d.]+)\s*(B|KiB|MiB|GiB)\s*\|\s*([\d.]+)\s*(B|KiB|MiB|GiB)\/s/i,
      );

      const updateInfo: any = {};
      if (pctMatch) {
        updateInfo.percent = parseInt(pctMatch[1], 10);
      }
      if (metricsMatch) {
        updateInfo.size = `${metricsMatch[1]} ${metricsMatch[2]}`;
        updateInfo.speed = `${metricsMatch[3]} ${metricsMatch[4]}/s`;
      }

      if (Object.keys(updateInfo).length > 0) {
        spinner.update(updateInfo);
      }
    });

    const sigintHandler = () => {
      child.kill("SIGKILL");
      try {
        execSync(`rm -rf ${tmpPath}`);
      } catch {}
      process.stdout.write("\x1B[?25h\n");
      process.exit(130);
    };
    process.once("SIGINT", sigintHandler);

    child.on("close", (code) => {
      clearTimeout(timeoutId);
      process.off("SIGINT", sigintHandler);

      if (code === 0) {
        resolve();
      } else {
        const errorMsg = Buffer.concat(stderrBuffers).toString().trim();
        reject(new Error(errorMsg || `Git 克隆进程异常退出，状态码: ${code}`));
      }
    });

    child.on("error", (err) => {
      clearTimeout(timeoutId);
      process.off("SIGINT", sigintHandler);
      reject(err);
    });
  });
}

/**
 * 下载远程模板
 */
export async function downloadTemplate(
  url: string,
  target: string,
  mirror?: string,
): Promise<void> {
  const tmp = tmpdir();
  const tmpPath = `${tmp}/scaffold-${Date.now()}`;

  let rawUrl = url;
  let branch: string | undefined;

  // 解析分支，例如: github:vfiee/project-boilerplate#vue-pc -> rawUrl 为 github:vfiee/project-boilerplate, branch 为 vue-pc
  if (url.includes("#")) {
    const parts = url.split("#");
    rawUrl = parts[0];
    branch = parts[1];
  }

  // 转换 github 短协议，例如: github:vfiee/template-vue -> https://github.com/vfiee/template-vue.git
  let gitUrl = rawUrl;
  if (rawUrl.startsWith("github:")) {
    const repository = rawUrl.slice(7); // 去掉 "github:"
    gitUrl = `https://github.com/${repository}.git`;
  }

  // 应用镜像地址转换
  let finalGitUrl = gitUrl;
  if (mirror) {
    finalGitUrl = applyGithubMirror(gitUrl, mirror);
  }

  const repoLabel = getRepoLabel(gitUrl);
  const branchLabel = branch || "";
  const mirrorLabel = getMirrorName(mirror);
  const spinner = createCloneSpinner(repoLabel, branchLabel, mirror ? mirrorLabel : "");

  const cloneStart = Date.now();

  try {
    // 第一次尝试克隆 (可能是镜像，也可能是原源)
    const cloneCmd = branch
      ? `git clone --progress --depth 1 -b ${branch} ${finalGitUrl} ${tmpPath}`
      : `git clone --progress --depth 1 ${finalGitUrl} ${tmpPath}`;

    await runClone(cloneCmd, spinner, tmpPath);

    // 成功
    const duration = ((Date.now() - cloneStart) / 1000).toFixed(1);
    spinner.succeed(duration);

    // 移动文件到目标目录
    const { copyDir } = await import("./fs/copy");
    copyDir(tmpPath, target);
  } catch (firstError: any) {
    // 校验是否需要 Fallback 到官方源
    if (mirror) {
      spinner.warn(`镜像源克隆失败，正在尝试通过 GitHub 官方源重试...`);
      const officialCmd = branch
        ? `git clone --progress --depth 1 -b ${branch} ${gitUrl} ${tmpPath}`
        : `git clone --progress --depth 1 ${gitUrl} ${tmpPath}`;

      try {
        await runClone(officialCmd, spinner, tmpPath);
        const duration = ((Date.now() - cloneStart) / 1000).toFixed(1);
        spinner.succeed(duration);

        // 移动文件到目标目录
        const { copyDir } = await import("./fs/copy");
        copyDir(tmpPath, target);
      } catch (secondError: any) {
        spinner.fail(
          secondError.message,
          '💡 建议：当前网络可能存在异常，您可以运行 "vii speed" 测试最新镜像延迟，或运行 "vii mirror add" 添加其他加速源。',
        );
        throw new Error(
          `下载模版失败。\n1. 请检查您的网络连接或代理设置；\n2. 请确保已在本地安装 git命令；\n3. 请确认模板仓库地址及分支有效 (${gitUrl}${branch ? ` (分支: ${branch})` : ""})。\n\n具体错误: ${secondError.message}`,
        );
      }
    } else {
      spinner.fail(
        firstError.message,
        '💡 建议：当前网络可能存在异常，您可以运行 "vii speed" 测试最新镜像延迟，或运行 "vii mirror add" 添加其他加速源。',
      );
      throw new Error(
        `下载模版失败。\n1. 请检查您的网络连接或代理设置；\n2. 请确保已在本地安装 git命令；\n3. 请确认模板仓库地址及分支有效 (${gitUrl}${branch ? ` (分支: ${branch})` : ""})。\n\n具体错误: ${firstError.message}`,
      );
    }
  } finally {
    // 确保清理临时目录
    try {
      execSync(`rm -rf ${tmpPath}`);
    } catch {
      // 忽略清理临时目录本身的异常
    }
  }
}
