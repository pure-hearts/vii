// 发布选项
export interface ReleaseOptions {
  cwd?: string;
  dryRun?: boolean;
  skipTests?: boolean;
  skipPublish?: boolean;
  skipPush?: boolean;
  releaseAs?: string;
  all?: boolean;
  package?: string;
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
