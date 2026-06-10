import { readPkg, writePkg } from "./pkg";
import { calculateNewVersion, isValidVersion } from "./version";
import {
  promptReleaseType,
  promptCommitMessage,
  promptConfirm,
  promptSelectPackages,
} from "./prompts";
import { checkGitStatus } from "./steps/check-git";
import { commitAndTag } from "./steps/commit";
import { pushToRemote } from "./steps/push";
import { publishToNpm } from "./steps/publish";
import { npmVersionExists } from "./npm";
import { updateChangelog } from "./changelog";
import { createGitHubRelease, generateReleaseNotes, getGitHubRemote } from "./github";
import { loadConfig } from "./config";
import type { ReleaseOptions } from "./types";

/**
 * 从选项中提取 release type
 */
export function getReleaseType(options: ReleaseOptions): string | null {
  const flags = [
    options.patch && "patch",
    options.minor && "minor",
    options.major && "major",
    options.custom && "custom",
  ].filter(Boolean) as string[];

  if (flags.length > 1) {
    throw new Error(`版本标志互斥，只能选择一个: ${flags.join(", ")}`);
  }

  if (options.patch) return "patch";
  if (options.minor) return "minor";
  if (options.major) return "major";
  if (options.custom) {
    if (!isValidVersion(options.custom)) {
      throw new Error(`无效的版本号: ${options.custom}`);
    }
    return options.custom;
  }
  return null;
}

/**
 * 发布单个包
 */
async function releaseSingle(
  cwd: string,
  currentVersion: string,
  options: ReleaseOptions,
): Promise<void> {
  // 保存原始版本用于回滚
  const originalPkg = readPkg(cwd);
  const pkgName = originalPkg.name;
  let versionUpdated = false;

  try {
    // 1. 计算新版本
    const specifiedType = getReleaseType(options);
    const releaseType = specifiedType ?? (await promptReleaseType(""));
    if (releaseType === null) return;

    const newVersion = calculateNewVersion(currentVersion, releaseType);
    console.log(`\n🚀 版本更新: ${pkgName} → ${newVersion}\n`);

    // Dry-run: 显示信息后直接返回
    if (options.dryRun) {
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("🔍 [DRY RUN] 未实际执行");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━\n");
      return;
    }

    // 2. 检查版本是否已存在
    if (!options.skipPublish && npmVersionExists(pkgName, newVersion)) {
      throw new Error(`版本 ${newVersion} 已存在于 npm，请使用新版本号`);
    }

    // 3. 发布前确认
    if (!options.skipConfirm && !(await promptConfirm(pkgName, newVersion))) {
      console.log("已取消发布");
      return;
    }

    // 4. 更新 package.json
    writePkg(cwd, newVersion);
    versionUpdated = true;

    // 5. Changelog
    if (!options.skipChangelog) {
      const changelogConfig = options.config?.changelog;
      console.log("📝 更新 CHANGELOG...");
      updateChangelog(cwd, pkgName, newVersion, changelogConfig?.output);
    }

    // 6. GitHub Release
    if (!options.skipGithubRelease && !options.skipPush) {
      const remote = getGitHubRemote();
      if (remote) {
        console.log("🚀 创建 GitHub Release...");
        const releaseNotes = generateReleaseNotes(pkgName, newVersion);
        await createGitHubRelease(`v${newVersion}`, releaseNotes, options.config?.githubRelease);
      }
    }

    // 7. Git commit & tag
    const defaultMsg = `release: v${newVersion}`;
    const commitMsg = options.commitMessage ?? (await promptCommitMessage(defaultMsg));
    if (commitMsg === null) return;

    console.log("📝 Git commit & tag...");
    commitAndTag(cwd, newVersion, commitMsg);

    // 8. Git push
    if (!options.skipPush) {
      pushToRemote();
    }

    // 9. NPM publish
    if (!options.skipPublish) {
      publishToNpm(cwd);
    }

    console.log(`✅ 发布完成: ${pkgName}@${newVersion}\n`);
  } catch (error) {
    // 回滚版本
    if (versionUpdated) {
      console.log("⚠️  发布失败，正在回滚版本...");
      writePkg(cwd, originalPkg.version);
      console.log(`✅ 已回滚到 ${originalPkg.version}`);
    }
    throw error;
  }
}

/**
 * 主流水线
 */
export async function run(options: ReleaseOptions = {}): Promise<void> {
  const cwd = options.cwd ?? process.cwd();

  // 加载配置文件
  const config = loadConfig(cwd);
  const mergedOptions = { ...options, ...config } as ReleaseOptions;
  mergedOptions.config = config || undefined;

  // 1. 检查 Git 状态
  if (!mergedOptions.dryRun) {
    await checkGitStatus();
  } else {
    console.log("🔍 [DRY RUN] 跳过 Git 状态检查\n");
  }

  // 2. 选择包
  const selectedPackages = mergedOptions.package
    ? [mergedOptions.package]
    : await promptSelectPackages(cwd);

  if (!selectedPackages) return;

  // 3. 并行或串行发布
  if (mergedOptions.config?.parallel) {
    console.log("\n🚀 并行发布模式\n");
    await Promise.all(
      selectedPackages.map(async (pkgPath) => {
        const pkg = readPkg(pkgPath);
        console.log(`\n${"=".repeat(50)}`);
        console.log(`📦 准备发布: ${pkg.name}@${pkg.version}`);
        console.log("=".repeat(50));
        return releaseSingle(pkgPath, pkg.version, {
          ...mergedOptions,
          package: undefined,
        });
      }),
    );
  } else {
    console.log("\n📦 串行发布模式\n");
    for (const pkgPath of selectedPackages) {
      const pkg = readPkg(pkgPath);
      console.log(`\n${"=".repeat(50)}`);
      console.log(`📦 准备发布: ${pkg.name}@${pkg.version}`);
      console.log("=".repeat(50));

      await releaseSingle(pkgPath, pkg.version, {
        ...mergedOptions,
        package: undefined,
      });
    }
  }

  console.log("\n🎉 全部发布完成!");
}
