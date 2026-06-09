import { hasUncommittedChanges, isGitRepository } from "../git";

/**
 * 检查 Git 状态
 */
export function checkGitStatus(): void {
  if (!isGitRepository()) {
    throw new Error(
      "当前目录未检测到 Git 仓库。发布程序需要配合 Git 工作流使用，请先在此初始化 Git 仓库。",
    );
  }
  if (hasUncommittedChanges()) {
    throw new Error("有未提交的更改，请先提交后再发布");
  }
}
