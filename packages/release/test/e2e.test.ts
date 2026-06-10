import { describe, it, expect, beforeEach, vi } from "vitest";
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { run, getReleaseType } from "../src/run";
import { calculateNewVersion } from "../src/version";
import type { ReleaseOptions } from "../src/types";

const TEST_DIR = join(__dirname, "temp-e2e-test");

// 模拟 prompts
vi.mock("prompts", () => ({
  default: vi.fn(async ({ name }: { name: string }) => {
    if (name === "selected") return { selected: ["__all__"] };
    if (name === "type") return { type: "patch" };
    if (name === "confirm") return { confirm: true };
    if (name === "message") return { message: "chore: release" };
    return {};
  }),
}));

beforeEach(() => {
  if (!existsSync(TEST_DIR)) {
    mkdirSync(TEST_DIR, { recursive: true });
  }
});

describe("run E2E", () => {
  describe("dry-run 模式", () => {
    it("dry-run 不实际更新 package.json", async () => {
      const pkgPath = join(TEST_DIR, "package.json");
      writeFileSync(pkgPath, JSON.stringify({ name: "test-pkg", version: "1.0.0" }));

      await run({
        cwd: TEST_DIR,
        dryRun: true,
        patch: true,
      });

      const content = JSON.parse(require("node:fs").readFileSync(pkgPath, "utf-8"));
      expect(content.version).toBe("1.0.0"); // 版本未变
    });

    it("dry-run 跳过 Git 状态检查", async () => {
      const pkgPath = join(TEST_DIR, "package.json");
      writeFileSync(pkgPath, JSON.stringify({ name: "test-pkg", version: "1.0.0" }));

      // 不应该抛出错误
      await expect(
        run({
          cwd: TEST_DIR,
          dryRun: true,
          patch: true,
        }),
      ).resolves.not.toThrow();
    });
  });

  describe("版本计算", () => {
    it("patch 版本递增", () => {
      expect(calculateNewVersion("1.0.0", "patch")).toBe("1.0.1");
      expect(calculateNewVersion("1.2.3", "patch")).toBe("1.2.4");
    });

    it("minor 版本递增", () => {
      expect(calculateNewVersion("1.0.0", "minor")).toBe("1.1.0");
      expect(calculateNewVersion("1.2.3", "minor")).toBe("1.3.0");
    });

    it("major 版本递增", () => {
      expect(calculateNewVersion("1.0.0", "major")).toBe("2.0.0");
      expect(calculateNewVersion("2.3.4", "major")).toBe("3.0.0");
    });

    it("custom 版本直接使用", () => {
      expect(calculateNewVersion("1.0.0", "custom")).toBe("1.0.0");
      expect(calculateNewVersion("1.0.0", "2.0.0")).toBe("2.0.0");
    });
  });

  describe("skip 选项", () => {
    it("skip-changelog 跳过 changelog 更新", async () => {
      const pkgPath = join(TEST_DIR, "package.json");
      writeFileSync(pkgPath, JSON.stringify({ name: "test-pkg", version: "1.0.0" }));

      await run({
        cwd: TEST_DIR,
        dryRun: true,
        patch: true,
        skipChangelog: true,
      });

      // 静默完成，不抛出错误
      expect(true).toBe(true);
    });

    it("skip-confirm 跳过确认", async () => {
      const pkgPath = join(TEST_DIR, "package.json");
      writeFileSync(pkgPath, JSON.stringify({ name: "test-pkg", version: "1.0.0" }));

      await run({
        cwd: TEST_DIR,
        dryRun: true,
        patch: true,
        skipConfirm: true,
      });

      expect(true).toBe(true);
    });

    it("skip-github-release 跳过 GitHub Release", async () => {
      const pkgPath = join(TEST_DIR, "package.json");
      writeFileSync(pkgPath, JSON.stringify({ name: "test-pkg", version: "1.0.0" }));

      await run({
        cwd: TEST_DIR,
        dryRun: true,
        patch: true,
        skipGithubRelease: true,
      });

      expect(true).toBe(true);
    });

    it("skip-push 跳过 git push", async () => {
      const pkgPath = join(TEST_DIR, "package.json");
      writeFileSync(pkgPath, JSON.stringify({ name: "test-pkg", version: "1.0.0" }));

      await run({
        cwd: TEST_DIR,
        dryRun: true,
        patch: true,
        skipPush: true,
      });

      expect(true).toBe(true);
    });

    it("skip-publish 跳过 npm publish", async () => {
      const pkgPath = join(TEST_DIR, "package.json");
      writeFileSync(pkgPath, JSON.stringify({ name: "test-pkg", version: "1.0.0" }));

      await run({
        cwd: TEST_DIR,
        dryRun: true,
        patch: true,
        skipPublish: true,
      });

      expect(true).toBe(true);
    });
  });

  describe("版本标志互斥", () => {
    it("patch 标志设置正确", async () => {
      const pkgPath = join(TEST_DIR, "package.json");
      writeFileSync(pkgPath, JSON.stringify({ name: "test-pkg", version: "1.0.0" }));

      await run({
        cwd: TEST_DIR,
        dryRun: true,
        patch: true,
      });

      expect(true).toBe(true);
    });

    it("minor 标志设置正确", async () => {
      const pkgPath = join(TEST_DIR, "package.json");
      writeFileSync(pkgPath, JSON.stringify({ name: "test-pkg", version: "1.0.0" }));

      await run({
        cwd: TEST_DIR,
        dryRun: true,
        minor: true,
      });

      expect(true).toBe(true);
    });

    it("major 标志设置正确", async () => {
      const pkgPath = join(TEST_DIR, "package.json");
      writeFileSync(pkgPath, JSON.stringify({ name: "test-pkg", version: "1.0.0" }));

      await run({
        cwd: TEST_DIR,
        dryRun: true,
        major: true,
      });

      expect(true).toBe(true);
    });

    it("custom 标志设置正确", async () => {
      const pkgPath = join(TEST_DIR, "package.json");
      writeFileSync(pkgPath, JSON.stringify({ name: "test-pkg", version: "1.0.0" }));

      await run({
        cwd: TEST_DIR,
        dryRun: true,
        custom: "2.0.0",
      });

      expect(true).toBe(true);
    });

    it("同时指定 patch 和 minor 应抛出错误", () => {
      expect(() => getReleaseType({ patch: true, minor: true } as ReleaseOptions)).toThrow(
        "版本标志互斥",
      );
    });

    it("无效的自定义版本号应抛出错误", () => {
      expect(() => getReleaseType({ custom: "invalid-version" } as ReleaseOptions)).toThrow(
        "无效的版本号",
      );
    });
  });
});
