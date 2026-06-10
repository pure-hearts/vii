import semver from "semver";
import type { ReleaseType } from "./types";

/**
 * 计算新版本号
 */
export function calculateNewVersion(
  currentVersion: string,
  releaseType: ReleaseType | string,
  preRelease?: "alpha" | "beta" | "rc",
): string {
  let version = currentVersion;

  if (releaseType === "custom") {
    // custom 模式下，currentVersion 保持不变，后续会添加 preRelease
  } else if (["patch", "minor", "major"].includes(releaseType)) {
    version =
      semver.inc(currentVersion, releaseType as "patch" | "minor" | "major") ?? currentVersion;
  } else if (semver.valid(releaseType)) {
    version = releaseType;
  }

  // 添加预发布标识
  if (preRelease && semver.valid(version)) {
    version = semver.inc(version, "prerelease", preRelease) ?? version;
  }

  return version;
}

/**
 * 验证版本号是否合法
 */
export function isValidVersion(version: string): boolean {
  return semver.valid(version) !== null;
}
