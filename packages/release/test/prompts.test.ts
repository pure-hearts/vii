import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { discoverPackages } from "../src/prompts";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const TEST_DIR = resolve(__dirname, "temp-prompts-test");

beforeEach(() => {
  if (!existsSync(TEST_DIR)) {
    mkdirSync(TEST_DIR, { recursive: true });
  }
});

afterEach(() => {
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true, force: true });
  }
});

describe("prompts.ts", () => {
  describe("discoverPackages", () => {
    it("packages 目录不存在时返回空数组", () => {
      const result = discoverPackages("/nonexistent/path");
      expect(result).toEqual([]);
    });

    it("packages 目录为空时返回空数组", () => {
      mkdirSync(TEST_DIR, { recursive: true });
      const result = discoverPackages(TEST_DIR);
      expect(result).toEqual([]);
    });

    it("发现单个有效包", () => {
      mkdirSync(resolve(TEST_DIR, "packages", "test-pkg"), { recursive: true });
      writeFileSync(
        resolve(TEST_DIR, "packages", "test-pkg", "package.json"),
        JSON.stringify({ name: "test-pkg", version: "1.0.0" }),
      );

      const result = discoverPackages(TEST_DIR);
      expect(result).toHaveLength(1);
      expect(result[0]).toContain("test-pkg");
    });

    it("忽略没有 package.json 的目录", () => {
      mkdirSync(resolve(TEST_DIR, "packages", "no-pkg"), { recursive: true });

      const result = discoverPackages(TEST_DIR);
      expect(result).toEqual([]);
    });

    it("发现多个有效包", () => {
      mkdirSync(resolve(TEST_DIR, "packages", "pkg-a"), { recursive: true });
      mkdirSync(resolve(TEST_DIR, "packages", "pkg-b"), { recursive: true });
      writeFileSync(
        resolve(TEST_DIR, "packages", "pkg-a", "package.json"),
        JSON.stringify({ name: "pkg-a", version: "1.0.0" }),
      );
      writeFileSync(
        resolve(TEST_DIR, "packages", "pkg-b", "package.json"),
        JSON.stringify({ name: "pkg-b", version: "1.0.0" }),
      );

      const result = discoverPackages(TEST_DIR);
      expect(result).toHaveLength(2);
    });
  });
});
