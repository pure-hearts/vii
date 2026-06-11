import { readPkg, writePkg } from "./pkg";
import { calculateNewVersion, isValidVersion } from "./version";
import {
  promptReleaseType,
  promptCommitMessage,
  promptConfirm,
  promptSelectPackages,
} from "./prompts";
import { checkGitStatus } from "./steps/check-git";
import { gitAdd, gitCommit, gitTag, gitPushWithTags } from "./git";
import { npmPublish, npmVersionExists } from "./npm";
import { updateChangelog } from "./changelog";
import { createGitHubRelease, generateReleaseNotes, getGitHubRemote } from "./github";
import { loadConfig } from "./config";
import type { ReleaseOptions } from "./types";

interface ReleaseContext {
  pkgPath: string;
  pkgName: string;
  originalVersion: string;
  newVersion: string;
}

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
 * 主流水线
 */
export async function run(options: ReleaseOptions = {}): Promise<void> {
  const cwd = options.cwd ?? process.cwd();

  // 加载配置文件
  const config = await loadConfig(cwd);
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

  if (!selectedPackages || selectedPackages.length === 0) return;

  const updatedPackages: ReleaseContext[] = [];

  try {
    // 3. 准备阶段 (Prepare Phase)
    const specifiedType = getReleaseType(mergedOptions);

    for (const pkgPath of selectedPackages) {
      const pkg = readPkg(pkgPath);
      const pkgName = pkg.name;
      const originalVersion = pkg.version;

      console.log(`\n${"=".repeat(50)}`);
      console.log(`📦 准备发布: ${pkgName}@${originalVersion}`);
      console.log("=".repeat(50));

      // 3.1 获取新版本号
      const releaseType = specifiedType ?? (await promptReleaseType(originalVersion));
      if (releaseType === null) {
        console.log("已取消发布");
        return;
      }

      const newVersion = calculateNewVersion(
        originalVersion,
        releaseType,
        mergedOptions.preRelease,
      );
      console.log(`\n🚀 版本更新: ${pkgName} → ${newVersion}\n`);

      if (mergedOptions.dryRun) {
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("🔍 [DRY RUN] 未实际执行更新");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━\n");
        continue;
      }

      // 3.2 校验版本号是否已存在
      if (!mergedOptions.skipPublish && npmVersionExists(pkgName, newVersion)) {
        throw new Error(`版本 ${newVersion} 已存在于 npm，请使用新版本号`);
      }

      // 3.3 确认发布
      if (!mergedOptions.skipConfirm && !(await promptConfirm(pkgName, newVersion))) {
        console.log("已取消发布");
        return;
      }

      // 3.4 更新 package.json
      writePkg(pkgPath, newVersion);

      // 记录已写入的包，方便出错时回滚
      updatedPackages.push({
        pkgPath,
        pkgName,
        originalVersion,
        newVersion,
      });

      // 3.5 更新 Changelog
      if (!mergedOptions.skipChangelog) {
        const changelogConfig = mergedOptions.config?.changelog;
        console.log("📝 更新 CHANGELOG...");
        updateChangelog(pkgPath, pkgName, newVersion, changelogConfig?.output);
      }
    }

    if (mergedOptions.dryRun) {
      console.log("\n🎉 [DRY RUN] 模拟全部完成!");
      return;
    }

    if (updatedPackages.length === 0) {
      return;
    }

    // 4. Git 提交与打标签阶段 (Git Phase)
    console.log("\n📝 统一提交 Git 并打标签...");

    let commitMsg = "";
    if (updatedPackages.length === 1) {
      const { pkgName, newVersion } = updatedPackages[0];
      const defaultMsg = `chore: release ${pkgName}@${newVersion}`;
      commitMsg =
        mergedOptions.commitMessage ?? (await promptCommitMessage(defaultMsg)) ?? defaultMsg;
    } else {
      const summary = updatedPackages.map((p) => `${p.pkgName}@${p.newVersion}`).join(", ");
      const defaultMsg = `chore: release [${summary}]`;
      commitMsg =
        mergedOptions.commitMessage ?? (await promptCommitMessage(defaultMsg)) ?? defaultMsg;
    }

    // Git Commit
    gitAdd(".");
    gitCommit(commitMsg);

    // Git Tag
    // 如果只选择发布了一个包，且发布路径就是工作根目录，为了向下兼容打 `v${version}` 格式的 tag
    // 否则一律打更严谨的 `${pkgName}@${version}`
    const isSingleRootPkg = selectedPackages.length === 1 && selectedPackages[0] === cwd;
    for (const pkgCtx of updatedPackages) {
      const tag = isSingleRootPkg
        ? `v${pkgCtx.newVersion}`
        : `${pkgCtx.pkgName}@${pkgCtx.newVersion}`;
      console.log(`🏷️  打 Git 标签: ${tag}`);
      gitTag(tag);
    }

    // Git Push
    if (!mergedOptions.skipPush) {
      console.log("🚀 推送到 Git 远端...");
      gitPushWithTags();
    }

    // 5. GitHub Release 阶段
    if (!mergedOptions.skipGithubRelease && !mergedOptions.skipPush) {
      const remote = getGitHubRemote();
      if (remote) {
        for (const pkgCtx of updatedPackages) {
          const tag = isSingleRootPkg
            ? `v${pkgCtx.newVersion}`
            : `${pkgCtx.pkgName}@${pkgCtx.newVersion}`;
          console.log(`🚀 创建 GitHub Release: ${tag}...`);
          const releaseNotes = generateReleaseNotes(pkgCtx.pkgName, pkgCtx.newVersion);
          await createGitHubRelease(tag, releaseNotes, mergedOptions.config?.githubRelease);
        }
      }
    }

    // 6. NPM 发布阶段
    if (!mergedOptions.skipPublish) {
      if (mergedOptions.config?.parallel) {
        console.log("\n📦 并行发布到 npm...");
        await Promise.all(
          updatedPackages.map(async (pkgCtx) => {
            npmPublish(pkgCtx.pkgPath);
          }),
        );
      } else {
        console.log("\n📦 串行发布到 npm...");
        for (const pkgCtx of updatedPackages) {
          npmPublish(pkgCtx.pkgPath);
        }
      }
    }

    console.log("\n🎉 全部发布完成!");
  } catch (error) {
    if (updatedPackages.length > 0) {
      console.log("\n⚠️  发布过程中出错，正在回滚 package.json 版本...");
      for (const pkgCtx of updatedPackages) {
        try {
          writePkg(pkgCtx.pkgPath, pkgCtx.originalVersion);
          console.log(`✅ ${pkgCtx.pkgName} 已回滚到 ${pkgCtx.originalVersion}`);
        } catch (rollbackErr) {
          console.error(`❌ 回滚 ${pkgCtx.pkgName} 失败:`, rollbackErr);
        }
      }
    }
    throw error;
  }
}
