// Scaffold 配置
export interface ScaffoldOptions {
  projectName: string;
  template: string;
  targetDir: string;
  force?: boolean;
}

// 下载选项
export interface DownloadOptions {
  url: string;
  target: string;
}

// 验证结果
export interface ValidationResult {
  valid: boolean;
  error?: string;
}
