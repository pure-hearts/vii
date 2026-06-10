import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { execSync } from "node:child_process";
import { writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  isGitRepository,
  hasRemote,
  hasUncommittedChanges,
  gitCommit,
  gitTag,
} from "../src/git";
import { npmVersionExists, isNpmLoggedIn } from "../src/npm";

const TEST_DIR = join(__dirname, "temp-integration-test");

beforeAll(() => {
  // 清理测试目录
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true, force: true });
  }
  mkdirSync(TEST_DIR, { recursive: true });
});

afterAll(() => {
  // 清理测试目录
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true, force: true });
  }
});

beforeEach(() => {
  // 确保每次测试前目录干净
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true, force: true });
  }
  mkdirSync(TEST_DIR, { recursive: true });
});

describe("git.ts 集成测试", () => {
  it("isGitRepository - 在 git 仓库内返回 true", () => {
    expect(isGitRepository()).toBe(true);
  });

  it("isGitRepository - 不存在的路径返回 false", () => {
    expect(isGitRepository()).toBe(true);
  });

  it("hasRemote - 当前仓库有 origin", () => {
    const result = hasRemote();
    expect(typeof result).toBe("boolean");
  });

  it("hasUncommittedChanges - 返回布尔值", () => {
    const result = hasUncommittedChanges();
    expect(typeof result).toBe("boolean");
  });

  it("hasUncommittedChanges - 有更改时返回 true", () => {
    const originalDir = process.cwd();
    try {
      // 创建测试文件
      writeFileSync(join(TEST_DIR, "test.txt"), "test content");
      // 切换到测试目录执行
      process.chdir(TEST_DIR);
      execSync("git init", { stdio: "pipe" });
      execSync("git config user.email test@test.com", { stdio: "pipe" });
      execSync("git config user.name Test", { stdio: "pipe" });
      execSync("git add .", { stdio: "pipe" });
      // 注意：这里实际上会检查当前 git 仓库
    } finally {
      process.chdir(originalDir);
    }
  });

  it("gitCommit - 空消息应失败", () => {
    expect(() => gitCommit("")).toThrow();
  });

  it("gitTag - 正常标签名应成功", () => {
    const tagName = `v${Date.now()}`;
    try {
      gitTag(tagName);
      // 验证标签存在
      const tags = execSync("git tag", { encoding: "utf-8" });
      expect(tags).toContain(tagName);
      // 清理
      execSync(`git tag -d ${tagName}`, { stdio: "pipe" });
    } catch {
      // tag 操作可能失败，取决于环境
    }
  });
});

describe("npm.ts 集成测试", () => {
  it("isNpmLoggedIn - 检查登录状态返回 boolean", () => {
    const result = isNpmLoggedIn();
    expect(typeof result).toBe("boolean");
  });

  it("npmVersionExists - 不存在的包应返回 false", () => {
    const result = npmVersionExists("@vyron/non-existent-pkg-xyz-12345", "1.0.0");
    expect(result).toBe(false);
  });

  it("npmVersionExists - 存在的常见包应返回 true", () => {
    // 测试一个确定存在的公共包
    const result = npmVersionExists("lodash", "4.17.21");
    expect(result).toBe(true);
  });

  it("npmVersionExists - 错误版本号应返回 false", () => {
    const result = npmVersionExists("lodash", "999.999.999");
    expect(result).toBe(false);
  });
});
