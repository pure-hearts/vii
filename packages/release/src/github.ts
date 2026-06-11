import { execSync } from "node:child_process";
import type { GitHubReleaseConfig } from "./types";

/**
 * 获取 GitHub remote 信息
 */
export function getGitHubRemote(): { owner: string; repo: string } | null {
  try {
    const url = execSync("git remote get-url origin", {
      encoding: "utf-8",
      stdio: "pipe",
    }).trim();

    // 支持 https://github.com/owner/repo 和 git@github.com:owner/repo
    const httpsMatch = url.match(/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?$/);
    if (httpsMatch) {
      return { owner: httpsMatch[1], repo: httpsMatch[2].replace(/\.git$/, "") };
    }

    const sshMatch = url.match(/github\.com:([^/]+)\/([^/]+?)(?:\.git)?$/);
    if (sshMatch) {
      return { owner: sshMatch[1], repo: sshMatch[2].replace(/\.git$/, "") };
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * 创建 GitHub Release
 */
export async function createGitHubRelease(
  tag: string,
  body: string,
  config: GitHubReleaseConfig = {},
): Promise<void> {
  const remote = getGitHubRemote();
  if (!remote) {
    throw new Error("无法获取 GitHub remote 信息");
  }

  const owner = config.owner || remote.owner;
  const repo = config.repo || remote.repo;
  const token = config.token || process.env.GITHUB_TOKEN;

  if (!token) {
    throw new Error("未设置 GITHUB_TOKEN 环境变量");
  }

  const isDraft = !!config.draft;
  const isPrerelease = !!config.prerelease;

  try {
    const postData = JSON.stringify({
      tag_name: tag,
      name: tag,
      body: body,
      draft: isDraft,
      prerelease: isPrerelease,
    }).replace(/'/g, "'\"'\"'");

    const response = execSync(
      `curl -s -w "\\n%{http_code}" -X POST \
        -H "Authorization: Bearer ${token}" \
        -H "Accept: application/vnd.github+json" \
        -H "X-GitHub-Api-Version: 2022-11-28" \
        -H "Content-Type: application/json" \
        -d '${postData}' \
        https://api.github.com/repos/${owner}/${repo}/releases`,
      { encoding: "utf-8" },
    ).trim();

    const lines = response.split("\n");
    const statusCode = parseInt(lines[lines.length - 1], 10);
    const responseBody = lines.slice(0, -1).join("\n");

    if (statusCode < 200 || statusCode >= 300) {
      throw new Error(`HTTP ${statusCode}: ${responseBody}`);
    }
  } catch (error) {
    throw new Error(`创建 GitHub Release 失败: ${(error as Error).message}`);
  }
}

/**
 * 生成 Release Notes
 */
export function generateReleaseNotes(pkgName: string, newVersion: string): string {
  const date = new Date().toISOString().split("T")[0];

  let notes = `# ${pkgName} v${newVersion}\n\n`;
  notes += `**发布日期:** ${date}\n\n`;

  try {
    // 获取自上次 release 以来的 commits
    const lastTag = execSync("git describe --tags --abbrev=0 2>/dev/null || echo ''", {
      encoding: "utf-8",
      stdio: "pipe",
    }).trim();

    if (lastTag) {
      const commits = execSync(`git log ${lastTag}..HEAD --pretty=format:"%s|%h"`, {
        encoding: "utf-8",
        stdio: "pipe",
      }).trim();

      if (commits) {
        const lines = commits.split("\n").filter(Boolean);
        const categorized = categorizeCommits(lines);

        if (categorized.features.length > 0) {
          notes += `## ✨ 新功能\n\n`;
          notes +=
            categorized.features.map((c) => `- ${c.message} (${c.hash})`).join("\n") + "\n\n";
        }
        if (categorized.fixes.length > 0) {
          notes += `## 🐛 Bug 修复\n\n`;
          notes += categorized.fixes.map((c) => `- ${c.message} (${c.hash})`).join("\n") + "\n\n";
        }
        if (categorized.breaking.length > 0) {
          notes += `## ⚠️ 破坏性变更\n\n`;
          notes +=
            categorized.breaking.map((c) => `- ${c.message} (${c.hash})`).join("\n") + "\n\n";
        }
        if (categorized.other.length > 0) {
          notes += `## 其他变更\n\n`;
          notes += categorized.other.map((c) => `- ${c.message} (${c.hash})`).join("\n") + "\n\n";
        }
      }
    }
  } catch {
    // 忽略 git 错误
  }

  return notes;
}

export interface CategorizedCommit {
  message: string;
  hash: string;
}

export interface CategorizedCommits {
  features: CategorizedCommit[];
  fixes: CategorizedCommit[];
  breaking: CategorizedCommit[];
  other: CategorizedCommit[];
}

export function categorizeCommits(commits: string[]): CategorizedCommits {
  const categorized: CategorizedCommits = {
    features: [],
    fixes: [],
    breaking: [],
    other: [],
  };

  for (const line of commits) {
    const [message, hash] = line.split("|");
    if (!message || !hash) continue;

    const lower = message.toLowerCase();
    const commit = { message, hash };

    if (lower.startsWith("feat") || lower.startsWith("feature") || lower.startsWith("新增")) {
      categorized.features.push(commit);
    } else if (lower.startsWith("fix") || lower.startsWith("bug") || lower.startsWith("修复")) {
      categorized.fixes.push(commit);
    } else if (lower.includes("breaking") || lower.includes("破坏") || message.includes("!")) {
      categorized.breaking.push(commit);
    } else {
      categorized.other.push(commit);
    }
  }

  return categorized;
}
