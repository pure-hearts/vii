import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import * as path from "node:path";

/**
 * 镜像克隆风格：决定 applyGithubMirror 的 URL 拼接方式
 * - "domain"     : 直接替换域名，如 kkgithub.com（默认行为）
 * - "gitclone"   : gitclone.com 专用格式，前缀 github.com 路径
 * - "prefix"     : 前缀代理格式，如 gh-proxy / akams / ghfast
 * - "gitee"      : Gitee 极速下载，仅保留 repo，owner 固定为 mirrors
 */
export type MirrorCloneStyle = "domain" | "gitclone" | "prefix" | "gitee";

export interface MirrorConfig {
  name: string;
  value: string;
  isBuiltin?: boolean;
  /** 该镜像的 clone URL 转换风格，undefined 时退化为 "domain" */
  cloneStyle?: MirrorCloneStyle;
}

export const BUILTIN_MIRRORS: MirrorConfig[] = [
  { name: "GitHub", value: "https://github.com", isBuiltin: true },
  // ── 以下为国内加速源（按实测直连延迟排序，2026-06-10 以 vuejs/vue 为参照仓库）──
  { name: "Akams", value: "https://github.akams.cn", isBuiltin: true, cloneStyle: "prefix" }, // ~179ms
  { name: "Gitee", value: "https://gitee.com/mirrors", isBuiltin: true, cloneStyle: "gitee" }, // ~505ms，仅热门仓库
  { name: "GHProxy", value: "https://gh-proxy.com", isBuiltin: true, cloneStyle: "prefix" }, // ~1244ms
  { name: "GHFast", value: "https://ghfast.top", isBuiltin: true, cloneStyle: "prefix" }, // ~3788ms
  // 已移除（直连不可用）：KKGitHub (404)、GitClone (502)
];

export function getConfigPath(): string {
  // 测试环境下允许使用环境变量覆盖配置路径
  if (process.env.TEMP_VIIRC_PATH) {
    return process.env.TEMP_VIIRC_PATH;
  }
  return path.join(homedir(), ".viirc");
}

export function getCustomMirrors(): MirrorConfig[] {
  const p = getConfigPath();
  if (!existsSync(p)) return [];
  try {
    const content = readFileSync(p, "utf-8");
    const json = JSON.parse(content);
    return json.mirrors || [];
  } catch {
    return [];
  }
}

export function getAllMirrors(): MirrorConfig[] {
  const custom = getCustomMirrors();
  return [
    ...BUILTIN_MIRRORS.map((m) => ({ ...m })),
    ...custom.map((m) => ({ ...m, isBuiltin: false })),
  ];
}

export function saveCustomMirrors(mirrors: MirrorConfig[]): void {
  const p = getConfigPath();
  try {
    // 写入时只保留自定义镜像的 name 和 value，剥离 isBuiltin 标志以免冗余
    const custom = mirrors
      .filter((m) => !m.isBuiltin)
      .map((m) => ({ name: m.name, value: m.value }));
    writeFileSync(p, JSON.stringify({ mirrors: custom }, null, 2), "utf-8");
  } catch (err: any) {
    throw new Error(`写入配置文件失败: ${err.message}`);
  }
}
