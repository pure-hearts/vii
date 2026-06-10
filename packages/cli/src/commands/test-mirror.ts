import { MIRRORS, testLatency } from "../prompts/mirror";
import { logger } from "../utils";

export const testMirrorCommand = {
  name: "test-mirror",
  description: "测试 GitHub 镜像源的响应延迟",

  async action(): Promise<void> {
    console.log("\n⚡️ 开始测试 GitHub 镜像源延迟 (不使用代理)...");

    // 并发测试延迟
    const latencies = await Promise.all(MIRRORS.map((m) => testLatency(m.value)));

    console.log("\n📋 测试结果如下:");

    let fastestIndex = -1;
    let minLatency = Infinity;
    for (let i = 0; i < latencies.length; i++) {
      const ms = latencies[i];
      if (ms > 0 && ms < minLatency) {
        minLatency = ms;
        fastestIndex = i;
      }
    }

    for (let i = 0; i < MIRRORS.length; i++) {
      const mirror = MIRRORS[i];
      const ms = latencies[i];
      if (ms > 0) {
        const recommendTag = i === fastestIndex ? " [最快]" : "";
        console.log(`  ✅ ${mirror.name.padEnd(16)}: ${String(ms).padStart(4)}ms${recommendTag}`);
      } else {
        console.log(`  ❌ ${mirror.name.padEnd(16)}: 超时/不可达`);
      }
    }

    console.log("");
    if (fastestIndex !== -1) {
      const fastestMirror = MIRRORS[fastestIndex];
      // 如果最快的是官方源本身，提示无需额外配置
      if (fastestMirror.value === "https://github.com") {
        logger.success("💡 官方源响应最快，无需配置任何镜像加速。");
      } else {
        logger.success(`💡 推荐使用: ${fastestMirror.name}`);
        console.log(`👉 配置命令: vii init <dir> -m ${fastestMirror.value}\n`);
      }
    } else {
      logger.error("⚠️ 所有镜像源均不可达，请检查您的网络连接。\n");
    }
  },
};
