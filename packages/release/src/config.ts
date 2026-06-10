import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { ReleaseConfig } from "./types";

const CONFIG_FILES = [".releaserc.json", ".releaserc.js", "release.config.js"];

/**
 * 加载发布配置
 */
export function loadConfig(cwd: string = process.cwd()): ReleaseConfig | null {
  for (const configFile of CONFIG_FILES) {
    const configPath = join(cwd, configFile);
    if (existsSync(configPath)) {
      try {
        const content = readFileSync(configPath, "utf-8");

        if (configFile.endsWith(".json")) {
          return JSON.parse(content);
        }

        // JS config file - require it
        if (configFile.endsWith(".js")) {
          const { default: config } = require(configPath);
          return config;
        }
      } catch (error) {
        console.warn(`⚠️  加载配置文件 ${configFile} 失败:`, error);
      }
    }
  }

  return null;
}

/**
 * 合并配置和命令行选项
 */
export function mergeConfig(
  config: ReleaseConfig | null,
  options: Record<string, unknown>,
): Record<string, unknown> {
  if (!config) {
    return options;
  }

  return {
    ...config,
    ...options,
    // 命令行选项优先
    githubRelease: {
      ...config.githubRelease,
      ...((options.githubRelease as Record<string, unknown>) || {}),
    },
    changelog: {
      ...config.changelog,
      ...((options.changelog as Record<string, unknown>) || {}),
    },
  };
}
