import { describe, it, expect } from "vitest";
import { calculateNewVersion, isValidVersion } from "../src/version";

describe("version.ts", () => {
  describe("calculateNewVersion", () => {
    it("patch - 升級 patch 版本", () => {
      expect(calculateNewVersion("1.2.3", "patch")).toBe("1.2.4");
    });

    it("minor - 升級 minor 版本", () => {
      expect(calculateNewVersion("1.2.3", "minor")).toBe("1.3.0");
    });

    it("major - 升級 major 版本", () => {
      expect(calculateNewVersion("1.2.3", "major")).toBe("2.0.0");
    });

    it("custom - 返回原版本", () => {
      expect(calculateNewVersion("1.2.3", "custom")).toBe("1.2.3");
    });

    it("完整版本号 - 直接返回", () => {
      expect(calculateNewVersion("1.2.3", "2.0.0")).toBe("2.0.0");
    });

    it("非法类型 - 返回原版本", () => {
      expect(calculateNewVersion("1.2.3", "invalid")).toBe("1.2.3");
    });
  });

  describe("isValidVersion", () => {
    it("合法版本号", () => {
      expect(isValidVersion("1.2.3")).toBe(true);
    });

    it("带预发布版本", () => {
      expect(isValidVersion("1.2.3-beta.1")).toBe(true);
    });

    it("非法版本号", () => {
      expect(isValidVersion("invalid")).toBe(false);
    });

    it("非法版本号格式", () => {
      expect(isValidVersion("not-a-version")).toBe(false);
      expect(isValidVersion("1.2")).toBe(false);
      expect(isValidVersion("1.2.3.4")).toBe(false);
    });
  });
});
