import { existsSync } from "node:fs";
import { isEmpty } from "./fs/empty";

/**
 * 验证项目名是否合法
 */
export function validateProjectName(name: string): boolean {
  if (!name) return false;

  // NPM 包名规则: @scope/name 或 name
  const namePattern = /^(?:@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;
  return namePattern.test(name);
}

/**
 * 验证目标目录
 */
export function validateTargetDir(
  targetDir: string,
  force: boolean = false,
): { valid: boolean; error?: string } {
  if (!existsSync(targetDir)) {
    return { valid: true };
  }

  if (!isEmpty(targetDir)) {
    if (force) {
      return { valid: true };
    }
    return { valid: false, error: "目标目录不为空，请使用 --force 覆盖" };
  }

  return { valid: true };
}

/**
 * 格式化目标目录路径
 */
export function formatTargetDir(targetDir: string): string {
  // 移除末尾的 /
  return targetDir.replace(/\/$/, "");
}
