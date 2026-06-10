import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { execSync } from "node:child_process";

const CHANGELOG_NAME = "CHANGELOG.md";

/**
 * 生成 changelog 内容
 */
export function generateChangelog(pkgName: string, newVersion: string): string {
  const date = new Date().toISOString().split("T")[0];
  const commitMessage = execSync("git log -1 --pretty=format:%s", {
    encoding: "utf-8",
    stdio: "pipe",
  }).trim();

  return `## ${newVersion} (${date})

${commitMessage}

`;
}

/**
 * 更新 changelog
 */
export function updateChangelog(
  cwd: string,
  pkgName: string,
  newVersion: string,
  outputPath?: string,
): void {
  const changelogPath = outputPath ? join(cwd, outputPath) : join(cwd, CHANGELOG_NAME);

  const changelogContent = generateChangelog(pkgName, newVersion);

  if (existsSync(changelogPath)) {
    const existingContent = readFileSync(changelogPath, "utf-8");
    writeFileSync(changelogPath, changelogContent + "\n" + existingContent, "utf-8");
  } else {
    // 确保目录存在
    const dir = dirname(changelogPath);
    if (!existsSync(dir)) {
      const { mkdirSync } = require("node:fs");
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(changelogPath, `# Changelog\n\n${changelogContent}`, "utf-8");
  }
}

/**
 * 读取现有 changelog
 */
export function readChangelog(cwd: string, outputPath?: string): string | null {
  const changelogPath = outputPath ? join(cwd, outputPath) : join(cwd, CHANGELOG_NAME);

  if (!existsSync(changelogPath)) {
    return null;
  }

  return readFileSync(changelogPath, "utf-8");
}
