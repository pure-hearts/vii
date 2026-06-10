import prompts from "prompts";

import { getAllMirrors } from "../utils/config";

export const MIRRORS = getAllMirrors();

/**
 * 需要临时清除的系统代理环境变量键名列表。
 * 清除这些变量能确保 fetch/git 操作走直连网络，完全复现国内真实环境。
 */
const PROXY_ENV_KEYS = [
  "http_proxy",
  "https_proxy",
  "HTTP_PROXY",
  "HTTPS_PROXY",
  "all_proxy",
  "ALL_PROXY",
  "no_proxy",
  "NO_PROXY",
] as const;

/**
 * 测试单个镜像地址对目标 GitHub 仓库的延迟（不使用代理）。
 *
 * 不再仅对域名根目录发 HEAD，而是通过请求目标仓库的
 * `info/refs?service=git-upload-pack` 端点来验证该镜像真正支持
 * Git 协议，并量化其实际克隆延迟（RTT）。
 *
 * @param mirrorValue   - 镜像 value，如 "https://gh-proxy.com" 或 "https://gitee.com/mirrors"
 * @param targetGitUrl  - 用于探测的目标 GitHub 仓库地址，默认 vuejs/vue
 * @returns 延迟毫秒数，或 -1（超时 / 不可达 / 非 200）
 */
export async function testLatency(
  mirrorValue: string,
  targetGitUrl: string = "https://github.com/vuejs/vue.git",
): Promise<number> {
  // ── 1. 备份并清除代理环境变量（强制直连）────────────────────────────
  const envBackup: Record<string, string | undefined> = {};
  for (const key of PROXY_ENV_KEYS) {
    envBackup[key] = process.env[key];
    delete process.env[key];
  }

  try {
    // ── 2. 将目标 git URL 转换为该镜像的访问地址 ──────────────────────
    const { applyGithubMirror } = await import("../scaffold/download");
    const convertedGitUrl = applyGithubMirror(targetGitUrl, mirrorValue);

    // ── 3. 拼接 Git 协议探测端点 ──────────────────────────────────────
    // 通过请求 info/refs 端点来判断镜像是否真正支持该仓库的 Git 协议。
    const baseUrl = convertedGitUrl.replace(/\.git$/, "").replace(/\/$/, "");
    const detectUrl = `${baseUrl}/info/refs?service=git-upload-pack`;

    // ── 4. 发起直连请求，计算 RTT ─────────────────────────────────────
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 秒超时
    const start = Date.now();

    let ok = false;
    try {
      const res = await fetch(detectUrl, {
        method: "GET",
        signal: controller.signal,
        // 不设置 mode，Node.js fetch 默认不走系统代理（已靠清除环境变量双重保障）
      });
      ok = res.ok; // 200 才算可用
    } finally {
      clearTimeout(timeoutId);
    }

    return ok ? Date.now() - start : -1;
  } catch {
    return -1; // 超时 / 网络错误
  } finally {
    // ── 5. 恢复代理环境变量，防止影响后续流程 ────────────────────────
    for (const key of PROXY_ENV_KEYS) {
      if (envBackup[key] !== undefined) {
        process.env[key] = envBackup[key];
      }
    }
  }
}

/**
 * 询问 GitHub 镜像源
 */
export async function promptMirror(): Promise<string> {
  console.log("\n⚡️ 正在测试 GitHub 镜像源延迟 (不使用代理)...");

  // 并发测试延迟
  const latencies = await Promise.all(MIRRORS.map((m) => testLatency(m.value)));

  // 寻找最快镜像的索引（值最小且大于 0）
  let fastestIndex = -1;
  let minLatency = Infinity;
  for (let i = 0; i < latencies.length; i++) {
    const ms = latencies[i];
    if (ms > 0 && ms < minLatency) {
      minLatency = ms;
      fastestIndex = i;
    }
  }

  // 构建选项列表
  const choices = MIRRORS.map((m, idx) => {
    const ms = latencies[idx];
    const latencyStr = ms > 0 ? `${ms}ms` : "超时/不可达";
    const recommendTag = idx === fastestIndex ? " [推荐]" : "";
    return {
      value: m.value,
      title: `${m.name} (${latencyStr})${recommendTag}`,
    };
  });

  // 加入自定义选项
  choices.push({
    value: "custom",
    title: "自定义 GitHub 镜像源地址",
  });

  const { mirror } = await prompts({
    type: "select",
    name: "mirror",
    message: "选择 GitHub 镜像源:",
    choices,
  });

  if (mirror === "custom") {
    const { customMirror } = await prompts({
      type: "text",
      name: "customMirror",
      message: "请输入自定义 GitHub 镜像地址 (例如: https://kkgithub.com):",
      validate: (value: string) => {
        const trimmed = value.trim();
        if (!trimmed) return "输入不能为空";
        try {
          new URL(trimmed);
          return true;
        } catch {
          return "请输入有效的 URL 地址";
        }
      },
    });
    return customMirror ? customMirror.trim() : "";
  }

  // 如果选择官方源本身，返回空以表示不用任何镜像替换
  if (mirror === "https://github.com") {
    return "";
  }

  return mirror || "";
}
