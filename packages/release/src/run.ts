import { readPkg, writePkg } from "./pkg";
import { calculateNewVersion } from "./version";
import { promptReleaseType, promptCommitMessage } from "./prompts";
import { checkGitStatus } from "./steps/check-git";
import { commitAndTag } from "./steps/commit";
import { pushToRemote } from "./steps/push";
import { publishToNpm } from "./steps/publish";
import type { ReleaseOptions } from "./types";

/**
 * 主流水线
 */
export async function run(options: ReleaseOptions = {}): Promise<void> {
  const cwd = options.cwd ?? process.cwd();

  // 1. 检查 Git 状态
  await checkGitStatus();

  // 2. 读取当前版本
  const pkg = readPkg(cwd);
  console.log(`📦 当前版本: ${pkg.name}@${pkg.version}`);

  // 3. 计算新版本
  const releaseType = options.releaseAs ?? (await promptReleaseType(pkg.version));
  if (releaseType === null) return;

  const newVersion = calculateNewVersion(pkg.version, releaseType);
  console.log(`\n🚀 版本更新: ${pkg.version} → ${newVersion}\n`);

  // 4. 更新 package.json
  writePkg(cwd, newVersion);

  if (options.dryRun) {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🔍 [DRY RUN] 未实际执行");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━\n");
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
    console.log("🚀 Git push...");
    pushToRemote();
  }

  // 7. NPM publish
  if (!options.skipPublish) {
    console.log("📦 NPM publishing...");
    publishToNpm(cwd);
  }

  console.log(`\n✅ 发布完成: ${pkg.name}@${newVersion}`);
}
