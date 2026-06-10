import prompts from "prompts";
import { calculateNewVersion } from "./version";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * 发现 packages 目录下的所有包
 */
export function discoverPackages(cwd: string): string[] {
  const packagesDir = join(cwd, "packages");
  if (!existsSync(packagesDir)) {
    return [];
  }

  try {
    return readdirSync(packagesDir, { withFileTypes: true })
      .filter((dirent: { isDirectory: () => boolean }) => dirent.isDirectory())
      .filter((dirent: { name: string }) =>
        existsSync(join(packagesDir, dirent.name, "package.json")),
      )
      .map((dirent: { name: string }) => join(packagesDir, dirent.name));
  } catch {
    return [];
  }
}

/**
 * 交互式选择要发布的包
 */
export async function promptSelectPackages(cwd: string): Promise<string[] | null> {
  const packages = discoverPackages(cwd);

  if (packages.length === 0) {
    return null;
  }

  const packageOptions = packages.map((pkgPath) => {
    const name = pkgPath.split("/").pop() || pkgPath;
    return {
      value: pkgPath,
      title: name,
      description: pkgPath,
    };
  });

  const { selected } = await prompts({
    type: "multiselect",
    name: "selected",
    message: "选择要发布的包:",
    choices: [
      { value: "__all__", title: "全部包", description: "发布 packages 下的所有包" },
      ...packageOptions,
    ],
  });

  if (!selected || selected.length === 0) {
    console.log("已取消发布");
    return null;
  }

  if (selected.includes("__all__")) {
    return packages;
  }

  return selected;
}

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

/**
 * 发布前确认
 */
export async function promptConfirm(pkgName: string, newVersion: string): Promise<boolean> {
  const { confirm } = await prompts({
    type: "confirm",
    name: "confirm",
    message: `确认发布 ${pkgName}@${newVersion}?`,
    initial: true,
  });

  return confirm;
}
