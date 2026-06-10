// 发布选项
export interface ReleaseOptions {
  cwd?: string;
  dryRun?: boolean;
  skipTests?: boolean;
  skipPublish?: boolean;
  skipPush?: boolean;
  skipConfirm?: boolean;
  skipChangelog?: boolean;
  skipGithubRelease?: boolean;
  releaseAs?: string;
  commitMessage?: string;
  all?: boolean;
  package?: string;
  config?: ReleaseConfig;
}

// 发布配置
export interface ReleaseConfig {
  changelog?: ChangelogConfig;
  githubRelease?: GitHubReleaseConfig;
  parallel?: boolean;
}

// Changelog 配置
export interface ChangelogConfig {
  output?: string;
  template?: string;
}

// GitHub Release 配置
export interface GitHubReleaseConfig {
  owner?: string;
  repo?: string;
  token?: string;
  draft?: boolean;
  prerelease?: boolean;
}

// package.json 信息
export interface PkgInfo {
  name: string;
  version: string;
  path: string;
}

// 发布步骤
export interface ReleaseStep {
  name: string;
  run: () => Promise<void>;
}

// Git 提交信息
export interface CommitInfo {
  message: string;
  files?: string[];
}

// 版本类型
export type ReleaseType = "patch" | "minor" | "major" | "custom";
