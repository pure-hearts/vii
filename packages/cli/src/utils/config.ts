import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import * as path from "node:path";

export interface MirrorConfig {
  name: string;
  value: string;
  isBuiltin?: boolean;
}

export const BUILTIN_MIRRORS: MirrorConfig[] = [
  { name: "GitHub", value: "https://github.com", isBuiltin: true },
  { name: "KKGitHub", value: "https://kkgithub.com", isBuiltin: true },
  { name: "GitClone", value: "https://gitclone.com", isBuiltin: true },
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
