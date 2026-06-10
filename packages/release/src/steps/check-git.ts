import prompts from "prompts";
import { hasUncommittedChanges, hasRemote, isGitRepository, gitAdd, gitCommit } from "../git";

/**
 * 检查 Git 状态
 */
export async function checkGitStatus(): Promise<void> {
  if (!isGitRepository()) {
    const { action } = await prompts({
      type: "select",
      name: "action",
      message: "⚠️  当前目录未检测到 Git 仓库，请选择操作:",
      choices: [
        {
          value: "init",
          title: "🔧 初始化 Git 仓库并继续发布",
        },
        {
          value: "cancel",
          title: "❌ 取消发布",
        },
      ],
    });

    if (action === "init") {
      const { success } = await runGitInit();
      if (!success) {
        throw new Error("Git init 失败，请检查目录权限");
      }
    }
  }
  if (!hasRemote()) {
    console.log("⚠️  未设置 remote，无法推送");
    process.exit(1);
  }
  if (hasUncommittedChanges()) {
    const { action } = await prompts({
      type: "select",
      name: "action",
      message: "⚠️  检测到未提交的更改，请选择操作:",
      choices: [
        {
          value: "commit",
          title: "📝 提交更改并继续发布",
        },
        {
          value: "stash",
          title: "📦 暂存更改并继续发布",
        },
        {
          value: "cancel",
          title: "❌ 取消发布",
        },
      ],
    });

    if (action === "cancel" || !action) {
      process.exit(0);
    }

    if (action === "stash") {
      const { success } = await runStash();
      if (!success) {
        throw new Error("git stash 失败，请检查工作区状态");
      }
    }

    if (action === "commit") {
      const { message } = await prompts({
        type: "text",
        name: "message",
        message: "输入提交信息:",
        initial: `chore: release`,
      });
      if (!message) {
        process.exit(0);
      }
      gitAdd();
      gitCommit(message);
    }
  }
}

async function runGitInit(): Promise<{ success: boolean }> {
  try {
    const { execSync } = await import("node:child_process");
    execSync("git init", { stdio: "pipe" });
    return { success: true };
  } catch {
    return { success: false };
  }
}

async function runStash(): Promise<{ success: boolean }> {
  try {
    const { execSync } = await import("node:child_process");
    execSync("git stash", { stdio: "pipe" });
    return { success: true };
  } catch {
    return { success: false };
  }
}
