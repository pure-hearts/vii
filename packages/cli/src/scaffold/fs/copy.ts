import { copyFileSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * 复制文件
 */
export function copyFile(src: string, dest: string): void {
  copyFileSync(src, dest);
}

/**
 * 递归复制目录
 */
export function copyDir(src: string, dest: string): void {
  mkdirSync(dest, { recursive: true });
  const entries = readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}
