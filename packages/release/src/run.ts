import { readPkg, writePkg } from "./pkg";
import { calculateNewVersion } from "./version";
import { promptReleaseType, promptCommitMessage, promptConfirm } from "./prompts";
import { checkGitStatus } from "./steps/check-git";
import { commitAndTag } from "./steps/commit";
import { pushToRemote } from "./steps/push";
import { publishToNpm } from "./steps/publish";
import { npmVersionExists } from "./npm";
import type { ReleaseOptions } from "./types";

/**
 * 主流水线
 */
export async function run(options: ReleaseOptions = {}): Promise<void> {
  const cwd = options.cwd ?? process.cwd();

  // 1. 检查 Git 状态（DryRun 也检查，但不阻塞）
  if (!options.dryRun) {
    await checkGitStatus();
  } else {
    console.log("🔍 [DRY RUN] 跳过 Git 状态检查\n");
  }

  // 2. 读取当前版本
  const pkg = readPkg(cwd);
  console.log(`📦 当前版本: ${pkg.name}@${pkg.version}`);

  // 3. 计算新版本
  const releaseType = options.releaseAs ?? (await promptReleaseType(pkg.version));
  if (releaseType === null) return;

  const newVersion = calculateNewVersion(pkg.version, releaseType);
  console.log(`\n🚀 版本更新: ${pkg.version} → ${newVersion}\n`);

  // 4. 检查版本是否已存在
  if (!options.skipPublish && npmVersionExists(pkg.name, newVersion)) {
    throw new Error(`版本 ${newVersion} 已存在于 npm，请使用新版本号`);
  }

  // 5. 更新 package.json
  writePkg(cwd, newVersion);

  if (options.dryRun) {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🔍 [DRY RUN] 未实际执行");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━\n");
    return;
  }

  // 6. 发布前确认
  if (!options.skipConfirm && !(await promptConfirm(pkg.name, newVersion))) {
    console.log("已取消发布");
    return;
  }

  // 7. Git commit & tag
  const defaultMsg = `release: ${newVersion}`;
  const commitMsg = options.commitMessage ?? (await promptCommitMessage(defaultMsg));
  if (commitMsg === null) return;

  console.log("📝 Git commit & tag...");
  commitAndTag(cwd, newVersion, commitMsg);

  // 8. Git push
  if (!options.skipPush) {
    console.log("🚀 Git push...");
    pushToRemote();
  }

  // 9. NPM publish
  if (!options.skipPublish) {
    publishToNpm(cwd);
  }

  console.log(`\n✅ 发布完成: ${pkg.name}@${newVersion}`);
}
