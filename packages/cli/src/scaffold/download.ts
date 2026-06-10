import { execSync, spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { BUILTIN_MIRRORS, getAllMirrors } from "../utils/config";
import { createCloneSpinner } from "../utils/spinner";

/**
 * 从原始 GitHub URL 中解析 owner 和 repo
 * 支持 https://github.com/owner/repo.git 及 github:owner/repo 等格式
 */
export function parseGithubRepo(gitUrl: string): { owner: string; repo: string } | null {
  // 先规范化：去掉末尾 .git 和 /
  const clean = gitUrl.replace(/\.git$/, "").replace(/\/$/, "");
  // 匹配 github.com/owner/repo 或 github:owner/repo
  const match = clean.match(/(?:github\.com\/|github:)([^/]+)\/([^/]+)$/);
  if (match) return { owner: match[1], repo: match[2] };
  return null;
}

/**
 * 应用 GitHub 镜像地址转换
 * 支持四种转换风格（由 MirrorConfig.cloneStyle 决定）：
 *   - "gitclone" : https://gitclone.com/github.com/{owner}/{repo}.git
 *   - "prefix"   : https://{mirrorHost}/https://github.com/{owner}/{repo}.git
 *   - "gitee"    : https://gitee.com/mirrors/{repo}.git
 *   - "domain"   : 直接替换域名（默认）
 */
export function applyGithubMirror(gitUrl: string, mirror: string): string {
  if (!mirror) return gitUrl;

  const normalizedMirror = mirror.trim().replace(/\/$/, "");

  // 在内置镜像列表中查找 cloneStyle
  const allMirrors = getAllMirrors();
  const found = allMirrors.find((m) => m.value.replace(/\/$/, "") === normalizedMirror);
  const style = found?.cloneStyle ?? "domain";

  const parsed = parseGithubRepo(gitUrl);

  if (style === "gitclone") {
    // https://gitclone.com/github.com/{owner}/{repo}.git
    if (parsed) {
      return `https://gitclone.com/github.com/${parsed.owner}/${parsed.repo}.git`;
    }
    // fallback：原来的字符串拼接方式
    const repoPath = gitUrl.replace(/^https:\/\/github\.com\//, "");
    return `https://gitclone.com/github.com/${repoPath}`;
  }

  if (style === "prefix") {
    // https://{mirrorHost}/https://github.com/{owner}/{repo}.git
    const mirrorBase = normalizedMirror.startsWith("http")
      ? normalizedMirror
      : `https://${normalizedMirror}`;
    if (parsed) {
      return `${mirrorBase}/https://github.com/${parsed.owner}/${parsed.repo}.git`;
    }
    return `${mirrorBase}/${gitUrl}`;
  }

  if (style === "gitee") {
    // https://gitee.com/mirrors/{repo}.git
    if (parsed) {
      return `https://gitee.com/mirrors/${parsed.repo}.git`;
    }
    return gitUrl; // 无法解析则回退原始 URL
  }

  // 默认："domain" — 直接替换域名，兼容自定义镜像
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

// 提取镜像源名称的辅助函数（查内置表，找不到时回退到 hostname）
export function getMirrorName(mirror?: string): string {
  if (!mirror) return "官方源";
  const normalizedMirror = mirror.trim().replace(/\/$/, "");
  // 优先从内置镜像列表中匹配 name
  const found = BUILTIN_MIRRORS.find((m) => m.value.replace(/\/$/, "") === normalizedMirror);
  if (found) return found.name;
  try {
    return new URL(mirror).hostname;
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
