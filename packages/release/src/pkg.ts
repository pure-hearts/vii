import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { PkgInfo } from "./types";

/**
 * 从 package.json 读取版本信息
 */
export function readPkg(cwd: string = process.cwd()): PkgInfo {
  const pkgPath = resolve(cwd, "package.json");
  const content = readFileSync(pkgPath, "utf-8");
  const pkg = JSON.parse(content) as { name: string; version: string };

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
  const content = readFileSync(pkgPath, "utf-8");
  const pkg = JSON.parse(content) as { version: string };

  pkg.version = newVersion;

  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf-8");
}
