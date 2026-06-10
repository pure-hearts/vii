import prompts from "prompts";

import { getAllMirrors } from "../utils/config";

export const MIRRORS = getAllMirrors();

/**
 * 测试单个地址的延迟 (不使用代理)
 */
export async function testLatency(url: string): Promise<number> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 1500); // 1.5秒超时

    // HEAD 请求只关心连接快慢，所以只要有任何回应即可
    const res = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
    });

    clearTimeout(id);

    if (!res.ok) {
      return -1;
    }

    return Date.now() - start;
  } catch {
    return -1; // 失败或超时
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
