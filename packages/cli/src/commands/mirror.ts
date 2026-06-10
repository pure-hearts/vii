import { getAllMirrors, saveCustomMirrors, getCustomMirrors } from "../utils/config";
import { testLatency } from "../prompts/mirror";
import { logger } from "../utils";

export const mirrorCommand = {
  name: "mirror",
  description: "GitHub 镜像源管理",

  async action(options: { subcommand?: string; args?: string[] }): Promise<void> {
    const subcommand = options.subcommand || "list";
    const subargs = options.args || [];

    if (subcommand === "list" || subcommand === "ls") {
      const all = getAllMirrors();
      console.log("\n📋 已有 GitHub 镜像源列表:");
      all.forEach((m) => {
        const typeTag = m.isBuiltin ? "[内置]" : "[自定义]";
        console.log(`  - ${m.name.padEnd(12)} : ${m.value} ${typeTag}`);
      });
      console.log("");
      return;
    }

    if (subcommand === "speed") {
      /** 用于探测的参照仓库（vuejs/vue 是热门项目，覆盖大多数镜像的缓存） */
      const TEST_REPO = "https://github.com/vuejs/vue.git";
      const all = getAllMirrors();
      console.log(`\n⚡️ 开始测试 GitHub 镜像源延迟 (直连，以 vuejs/vue 为参照仓库)...`);
      const latencies = await Promise.all(all.map((m) => testLatency(m.value, TEST_REPO)));

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

      for (let i = 0; i < all.length; i++) {
        const mirror = all[i];
        const ms = latencies[i];
        const typeTag = mirror.isBuiltin ? "[内置]" : "[自定义]";
        if (ms > 0) {
          const recommendTag = i === fastestIndex ? " [最快]" : "";
          console.log(
            `  ✅ ${mirror.name.padEnd(12)} ${typeTag.padEnd(6)}: ${String(ms).padStart(4)}ms${recommendTag}`,
          );
        } else {
          console.log(`  ❌ ${mirror.name.padEnd(12)} ${typeTag.padEnd(6)}: 超时/不可达`);
        }
      }

      console.log("");
      if (fastestIndex !== -1) {
        const fastestMirror = all[fastestIndex];
        if (fastestMirror.value === "https://github.com") {
          logger.success("💡 官方源响应最快，无需配置任何镜像加速。");
        } else {
          logger.success(`💡 推荐使用: ${fastestMirror.name}`);
          console.log(`👉 配置命令: vii init <dir> -m ${fastestMirror.value}\n`);
        }
      } else {
        logger.error("⚠️ 所有镜像源均不可达，请检查您的网络连接。\n");
      }
      return;
    }

    if (subcommand === "add") {
      const name = subargs[0];
      const url = subargs[1];

      if (!name || !url) {
        logger.error("❌ 参数错误！请使用: vii mirror add <name> <url>");
        process.exit(1);
      }

      try {
        new URL(url);
      } catch {
        logger.error(`❌ 参数错误！无效的镜像 URL: ${url}`);
        process.exit(1);
      }

      const all = getAllMirrors();
      // 检查同名
      if (all.some((m) => m.name.toLowerCase() === name.toLowerCase())) {
        logger.error(`❌ 添加失败！镜像源名称 "${name}" 已存在。`);
        process.exit(1);
      }

      // 检查同 URL
      if (all.some((m) => m.value.replace(/\/$/, "") === url.replace(/\/$/, ""))) {
        logger.error(`❌ 添加失败！该镜像源 URL 已存在。`);
        process.exit(1);
      }

      const custom = getCustomMirrors();
      custom.push({ name, value: url });
      saveCustomMirrors(custom);
      logger.success(`✅ 成功添加镜像源: ${name} (${url})`);
      return;
    }

    if (subcommand === "delete") {
      const name = subargs[0];
      if (!name) {
        logger.error("❌ 参数错误！请使用: vii mirror delete <name>");
        process.exit(1);
      }

      const all = getAllMirrors();
      const target = all.find((m) => m.name.toLowerCase() === name.toLowerCase());

      if (!target) {
        logger.error(`❌ 未找到镜像源: ${name}`);
        process.exit(1);
      }

      if (target.isBuiltin) {
        logger.error(`❌ 权限错误！内置镜像源 "${name}" 不允许删除。`);
        process.exit(1);
      }

      const custom = getCustomMirrors();
      const filtered = custom.filter((m) => m.name.toLowerCase() !== name.toLowerCase());
      saveCustomMirrors(filtered);
      logger.success(`✅ 成功删除镜像源: ${name}`);
      return;
    }

    logger.error(`❌ 未知子命令: ${subcommand}`);
    process.exit(1);
  },
};
