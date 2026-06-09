import { readPkg, writePkg } from "../pkg";
import { calculateNewVersion } from "../version";
import type { ReleaseType } from "../types";

/**
 * 更新版本号
 */
export function bumpVersion(cwd: string, releaseType: ReleaseType | string): string {
  const pkg = readPkg(cwd);
  const newVersion = calculateNewVersion(pkg.version, releaseType);
  writePkg(cwd, newVersion);
  return newVersion;
}
