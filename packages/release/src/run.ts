import { readPkg, writePkg } from "./pkg";
import { calculateNewVersion } from "./version";
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
import type { ReleaseOptions } from "./types";

/**
 * 发布单个包
 */
async function releaseSingle(cwd: string, pkgName: string, options: ReleaseOptions): Promise<void> {
  // 1. 计算新版本
  const releaseType = options.releaseAs ?? (await promptReleaseType(options.releaseAs || ""));
  if (releaseType === null) return;

  const newVersion = calculateNewVersion(pkgName, releaseType);
  console.log(`\n🚀 版本更新: ${pkgName} → ${newVersion}\n`);

  // 2. 检查版本是否已存在
  if (!options.skipPublish && npmVersionExists(pkgName, newVersion)) {
    throw new Error(`版本 ${newVersion} 已存在于 npm，请使用新版本号`);
  }

  // 3. 更新 package.json
  writePkg(cwd, newVersion);

  if (options.dryRun) {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🔍 [DRY RUN] 未实际执行");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━\n");
    return;
  }

  // 4. 发布前确认
  if (!options.skipConfirm && !(await promptConfirm(pkgName, newVersion))) {
    console.log("已取消发布");
    return;
  }

  // 5. Git commit & tag
  const defaultMsg = `release: ${newVersion}`;
  const commitMsg = options.commitMessage ?? (await promptCommitMessage(defaultMsg));
  if (commitMsg === null) return;

  console.log("📝 Git commit & tag...");
  commitAndTag(cwd, newVersion, commitMsg);

  // 6. Git push
  if (!options.skipPush) {
    pushToRemote();
  }

  // 7. NPM publish
  if (!options.skipPublish) {
    publishToNpm(cwd);
  }

  console.log(`✅ 发布完成: ${pkgName}@${newVersion}\n`);
}

/**
 * 主流水线
 */
export async function run(options: ReleaseOptions = {}): Promise<void> {
  const cwd = options.cwd ?? process.cwd();

  // 1. 检查 Git 状态
  if (!options.dryRun) {
    await checkGitStatus();
  } else {
    console.log("🔍 [DRY RUN] 跳过 Git 状态检查\n");
  }

  // 2. 选择包
  const selectedPackages = options.package ? [options.package] : await promptSelectPackages(cwd);

  if (!selectedPackages) return;

  // 3. 发布选中的包
  for (const pkgPath of selectedPackages) {
    const pkg = readPkg(pkgPath);
    console.log(`\n${"=".repeat(50)}`);
    console.log(`📦 准备发布: ${pkg.name}@${pkg.version}`);
    console.log("=".repeat(50));

    await releaseSingle(pkgPath, pkg.name, {
      ...options,
      package: undefined,
    });
  }
}
