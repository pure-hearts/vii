import semver from "semver";
import type { ReleaseType } from "./types";

/**
 * 计算新版本号
 */
export function calculateNewVersion(
  currentVersion: string,
  releaseType: ReleaseType | string,
): string {
  if (releaseType === "custom") {
    return currentVersion;
  }

  if (["patch", "minor", "major"].includes(releaseType)) {
    return semver.inc(currentVersion, releaseType as "patch" | "minor" | "major") ?? currentVersion;
  }

  // 已经是完整版本号
  if (semver.valid(releaseType)) {
    return releaseType;
  }

  return currentVersion;
}

/**
 * 验证版本号是否合法
 */
export function isValidVersion(version: string): boolean {
  return semver.valid(version) !== null;
}
