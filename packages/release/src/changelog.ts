import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { execSync } from "node:child_process";
import { categorizeCommits } from "./github";

const CHANGELOG_NAME = "CHANGELOG.md";

/**
 * 生成 changelog 内容
 */
export function generateChangelog(pkgName: string, newVersion: string): string {
  const date = new Date().toISOString().split("T")[0];
  let body = "";

  try {
    const lastTag = execSync("git describe --tags --abbrev=0 2>/dev/null || echo ''", {
      encoding: "utf-8",
      stdio: "pipe",
    }).trim();

    let commits = "";
    if (lastTag) {
      commits = execSync(`git log ${lastTag}..HEAD --pretty=format:"%s|%h"`, {
        encoding: "utf-8",
        stdio: "pipe",
      }).trim();
    } else {
      commits = execSync(`git log --pretty=format:"%s|%h"`, {
        encoding: "utf-8",
        stdio: "pipe",
      }).trim();
    }

    if (commits) {
      const lines = commits.split("\n").filter(Boolean);
      const categorized = categorizeCommits(lines);

      if (categorized.features.length > 0) {
        body +=
          `### ✨ Features\n\n` +
          categorized.features.map((c) => `- ${c.message} (${c.hash})`).join("\n") +
          "\n\n";
      }
      if (categorized.fixes.length > 0) {
        body +=
          `### 🐛 Bug Fixes\n\n` +
          categorized.fixes.map((c) => `- ${c.message} (${c.hash})`).join("\n") +
          "\n\n";
      }
      if (categorized.breaking.length > 0) {
        body +=
          `### ⚠️ Breaking Changes\n\n` +
          categorized.breaking.map((c) => `- ${c.message} (${c.hash})`).join("\n") +
          "\n\n";
      }
      if (categorized.other.length > 0) {
        body +=
          `### Other Changes\n\n` +
          categorized.other.map((c) => `- ${c.message} (${c.hash})`).join("\n") +
          "\n\n";
      }
    }
  } catch {
    // 忽略错误并 fallback
  }

  if (!body.trim()) {
    try {
      const lastCommit = execSync("git log -1 --pretty=format:%s", {
        encoding: "utf-8",
        stdio: "pipe",
      }).trim();
      body = `- ${lastCommit}\n\n`;
    } catch {
      body = "- Initial release\n\n";
    }
  }

  return `## ${newVersion} (${date})\n\n${body}`;
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
