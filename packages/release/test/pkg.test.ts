import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { readPkg, writePkg } from "../src/pkg";
import { readFileSync, writeFileSync, existsSync, unlinkSync } from "fs";
import { resolve } from "path";

const TEST_DIR = resolve(__dirname, "temp-pkg-test");

beforeEach(() => {
  import("fs").then((fs) => {
    if (!fs.existsSync(TEST_DIR)) {
      fs.mkdirSync(TEST_DIR, { recursive: true });
    }
  });
});

afterEach(() => {
  import("fs").then((fs) => {
    const pkgPath = resolve(TEST_DIR, "package.json");
    if (fs.existsSync(pkgPath)) {
      fs.unlinkSync(pkgPath);
    }
    if (fs.existsSync(TEST_DIR)) {
      fs.rmdirSync(TEST_DIR);
    }
  });
});

describe("pkg.ts", () => {
  describe("readPkg", () => {
    it("读取有效的 package.json", async () => {
      const fs = await import("fs");
      const pkgPath = resolve(TEST_DIR, "package.json");
      fs.writeFileSync(pkgPath, JSON.stringify({ name: "test-pkg", version: "1.0.0" }));

      const result = readPkg(TEST_DIR);
      expect(result.name).toBe("test-pkg");
      expect(result.version).toBe("1.0.0");
      expect(result.path).toBe(pkgPath);
    });

    it("目录不存在时抛出错误", () => {
      expect(() => readPkg("/nonexistent/path")).toThrow("未找到 package.json");
    });

    it("目录无 package.json 时抛出错误", async () => {
      const fs = await import("fs");
      fs.mkdirSync(TEST_DIR, { recursive: true });
      expect(() => readPkg(TEST_DIR)).toThrow("未找到 package.json");
    });
  });

  describe("writePkg", () => {
    it("写入新版本号", async () => {
      const fs = await import("fs");
      const pkgPath = resolve(TEST_DIR, "package.json");
      fs.writeFileSync(pkgPath, JSON.stringify({ name: "test-pkg", version: "1.0.0" }));

      writePkg(TEST_DIR, "2.0.0");

      const content = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
      expect(content.version).toBe("2.0.0");
    });

    it("目录不存在时抛出错误", () => {
      expect(() => writePkg("/nonexistent/path", "2.0.0")).toThrow("未找到 package.json");
    });
  });
});
