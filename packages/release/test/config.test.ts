import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { loadConfig } from "../src/config";
import { validatePackageName } from "../src/pkg";
import { writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const TEST_DIR = resolve(__dirname, "temp-config-test");

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

describe("pkg.ts", () => {
  describe("validatePackageName", () => {
    it("合法 unscoped 包名", () => {
      expect(validatePackageName("my-package").valid).toBe(true);
    });

    it("合法 scoped 包名", () => {
      expect(validatePackageName("@scope/package").valid).toBe(true);
    });

    it("带数字的包名", () => {
      expect(validatePackageName("package123").valid).toBe(true);
    });

    it("带连字符的包名", () => {
      expect(validatePackageName("my-package-name").valid).toBe(true);
    });

    it("带下划线的包名", () => {
      expect(validatePackageName("my_package_name").valid).toBe(true);
    });

    it("非法 - 只有 @ 没有斜杠", () => {
      const result = validatePackageName("@invalid");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("格式应为 @scope/name");
    });

    it("非法 - 包含特殊字符", () => {
      const result = validatePackageName("my package!");
      expect(result.valid).toBe(false);
    });
  });
});

describe("config.ts", () => {
  describe("loadConfig", () => {
    it("配置文件不存在时返回 null", async () => {
      const result = await loadConfig(TEST_DIR);
      expect(result).toBeNull();
    });

    it("加载 JSON 配置文件", async () => {
      writeFileSync(resolve(TEST_DIR, ".releaserc.json"), JSON.stringify({ parallel: true }));
      const result = await loadConfig(TEST_DIR);
      expect(result).toEqual({ parallel: true });
    });

    it("忽略无效的 JSON 配置", async () => {
      writeFileSync(resolve(TEST_DIR, ".releaserc.json"), "invalid json");
      const result = await loadConfig(TEST_DIR);
      expect(result).toBeNull();
    });

    it("加载 JS 配置文件", async () => {
      writeFileSync(resolve(TEST_DIR, ".releaserc.js"), "export default { parallel: true };");
      const result = await loadConfig(TEST_DIR);
      expect(result).toEqual({ parallel: true });
    });
  });
});
