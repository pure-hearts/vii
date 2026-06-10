import prompts from "prompts";
import { calculateNewVersion } from "./version";

/**
 * 交互式选择发布类型
 */
export async function promptReleaseType(currentVersion: string): Promise<string | null> {
  const versions = {
    patch: calculateNewVersion(currentVersion, "patch"),
    minor: calculateNewVersion(currentVersion, "minor"),
    major: calculateNewVersion(currentVersion, "major"),
  };

  const { type } = await prompts({
    type: "select",
    name: "type",
    message: "选择版本类型:",
    choices: [
      {
        value: "patch",
        title: `Patch (bugfix) → ${versions.patch}`,
        description: "向后兼容的 bug 修复",
      },
      {
        value: "minor",
        title: `Minor (新功能) → ${versions.minor}`,
        description: "向后兼容的新功能",
      },
      {
        value: "major",
        title: `Major (破坏性更新) → ${versions.major}`,
        description: "不兼容的 API 变更",
      },
      { value: "custom", title: "自定义版本号" },
    ],
  });

  if (!type) {
    console.log("已取消发布");
    return null;
  }

  if (type === "custom") {
    const { version } = await prompts({
      type: "text",
      name: "version",
      message: "输入版本号:",
      hint: currentVersion,
      initial: "",
    });
    if (!version) {
      console.log("已取消发布");
      return null;
    }
    return version;
  }

  return type;
}

/**
 * 交互式输入 commit message
 */
export async function promptCommitMessage(defaultMessage: string): Promise<string | null> {
  const { message } = await prompts({
    type: "text",
    name: "message",
    message: "输入 commit message:",
    initial: defaultMessage,
  });

  if (!message) {
    console.log("已取消发布");
    return null;
  }

  return message;
}
