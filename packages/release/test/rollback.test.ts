import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { writeFileSync, mkdirSync, existsSync, rmSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";
import { run } from "../src/run";

const TEST_DIR = join(__dirname, "temp-rollback-test");

// 模拟 prompts 避免交互式挂起
vi.mock("../src/prompts", () => ({
  promptReleaseType: vi.fn().mockResolvedValue("patch"),
  promptCommitMessage: vi.fn().mockResolvedValue("chore: release test"),
  promptConfirm: vi.fn().mockResolvedValue(true),
  promptSelectPackages: vi.fn().mockResolvedValue([]),
}));

// 模拟 npm，让 npmPublish 必定报错以触发回退
vi.mock("../src/npm", () => ({
  npmPublish: vi.fn().mockImplementation(() => {
    throw new Error("Mock npm publish error");
  }),
  npmVersionExists: vi.fn().mockReturnValue(false),
}));

// 模拟 github 以防触发真实网络请求，或者我们在测试里跳过
vi.mock("../src/github", () => ({
  createGitHubRelease: vi.fn().mockResolvedValue(undefined),
  generateReleaseNotes: vi.fn().mockReturnValue("Release notes"),
  getGitHubRemote: vi.fn().mockReturnValue({ owner: "test-owner", repo: "test-repo" }),
}));

describe("Release 错误自动回滚机制", () => {
  let originalCwd: string;

  beforeEach(() => {
    originalCwd = process.cwd();
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
    mkdirSync(TEST_DIR, { recursive: true });

    // 初始化 Git 仓库以便测试 Git 操作
    execSync("git init", { cwd: TEST_DIR, stdio: "ignore" });
    // 添加虚拟 Git 远端，使 checkGitStatus() 中的 hasRemote() 校验通过
    execSync("git remote add origin https://github.com/vfiee/project-boilerplate.git", {
      cwd: TEST_DIR,
      stdio: "ignore",
    });
    execSync("git config user.email test@test.com", { cwd: TEST_DIR, stdio: "ignore" });
    execSync("git config user.name Test", { cwd: TEST_DIR, stdio: "ignore" });

    // 创建初始 package.json
    writeFileSync(
      join(TEST_DIR, "package.json"),
      JSON.stringify({ name: "test-pkg", version: "1.0.0" }, null, 2),
    );

    // 初始提交
    execSync("git add .", { cwd: TEST_DIR, stdio: "ignore" });
    execSync('git commit -m "initial commit"', { cwd: TEST_DIR, stdio: "ignore" });

    // 切换进程工作目录到测试临时目录，防止污染或检测到全局 Git 状态
    process.chdir(TEST_DIR);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  it("当 npmPublish 报错时，应能成功撤销本地 Commit 并物理清除 Tag", async () => {
    const pkgJsonPath = join(TEST_DIR, "package.json");

    // 运行发布，因为我们 mock 了 npmPublish 会抛错，这里应当会抛出错误
    await expect(
      run({
        cwd: TEST_DIR,
        package: TEST_DIR,
        patch: true,
        skipConfirm: true,
        skipChangelog: true,
        skipGithubRelease: true,
        skipPush: true, // 不实际 push 远端
      }),
    ).rejects.toThrow("Mock npm publish error");

    // 1. 验证 package.json 版本号是否已经回滚到 1.0.0
    const pkg = JSON.parse(readFileSync(pkgJsonPath, "utf-8"));
    expect(pkg.version).toBe("1.0.0");

    // 2. 验证本地生成的 Tag 是否已经被成功物理删除
    const gitTags = execSync("git tag", { cwd: TEST_DIR, encoding: "utf-8" }).trim();
    expect(gitTags).not.toContain("test-pkg@1.0.1");

    // 3. 验证本地提交的 Commit 是否已经被 Reset 掉（最新 Commit 仍应是初始提交）
    const lastCommitMsg = execSync("git log -1 --pretty=%B", {
      cwd: TEST_DIR,
      encoding: "utf-8",
    }).trim();
    expect(lastCommitMsg).toBe("initial commit");

    // 4. 验证工作区是否为 Clean 状态 (无未提交改动)
    const status = execSync("git status --porcelain", { cwd: TEST_DIR, encoding: "utf-8" }).trim();
    expect(status).toBe("");
  });
});
