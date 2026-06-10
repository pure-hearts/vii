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

  const draft = config.draft ? "true" : "false";
  const prerelease = config.prerelease ? "true" : "false";

  const query = `
    mutation CreateRelease($input: CreateReleaseInput!) {
      createRelease(input: $input) {
        release {
          url
          tagName
        }
      }
    }
  `;

  const variables = {
    input: {
      repositoryId: `${owner}/${repo}`,
      tagName: tag,
      name: tag,
      body: body,
      isDraft: draft === "true",
      isPrerelease: prerelease === "true",
    },
  };

  execSync(
    `curl -s -X POST -H "Authorization: Bearer ${token}" -H "Content-Type: application/json" -d '${JSON.stringify({ query, variables }).replace(/'/g, "'\"'\"'")}' https://api.github.com/graphql`,
    { stdio: "inherit" },
  );
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
      const commits = execSync(`git log ${lastTag}..HEAD --pretty=format:"- %s (%h)"`, {
        encoding: "utf-8",
        stdio: "pipe",
      }).trim();

      if (commits) {
        notes += `## Commits\n\n${commits}\n`;
      }
    }
  } catch {
    // 忽略 git 错误
  }

  return notes;
}
