import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import type { PkgInfo } from "./types";

/**
 * 验证包名格式
 */
export function validatePackageName(name: string): { valid: boolean; error?: string } {
  // scoped package: @scope/name
  const scopedPattern = /^@[\w-]+\/[\w-]+$/;
  // unscoped package: name
  const unscopedPattern = /^[\w-]+$/;

  if (scopedPattern.test(name) || unscopedPattern.test(name)) {
    return { valid: true };
  }

  if (name.startsWith("@") && !name.includes("/")) {
    return { valid: false, error: "scoped 包名格式应为 @scope/name" };
  }

  return { valid: false, error: "包名只能包含字母、数字、- 和 _" };
}

/**
 * 从 package.json 读取版本信息
 */
export function readPkg(cwd: string = process.cwd()): PkgInfo {
  const pkgPath = resolve(cwd, "package.json");
  if (!existsSync(pkgPath)) {
    throw new Error("未找到 package.json，请在项目根目录执行");
  }
  const content = readFileSync(pkgPath, "utf-8");
  const pkg = JSON.parse(content) as { name: string; version: string };

  // 校验包名
  const validation = validatePackageName(pkg.name);
  if (!validation.valid) {
    throw new Error(`包名 "${pkg.name}" 格式不正确: ${validation.error}`);
  }

  return {
    name: pkg.name,
    version: pkg.version,
    path: pkgPath,
  };
}

/**
 * 更新 package.json 版本号
 */
export function writePkg(cwd: string, newVersion: string): void {
  const pkgPath = resolve(cwd, "package.json");
  if (!existsSync(pkgPath)) {
    throw new Error("未找到 package.json，请确认路径是否正确");
  }
  const content = readFileSync(pkgPath, "utf-8");
  const pkg = JSON.parse(content) as { version: string };

  pkg.version = newVersion;

  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf-8");
}
