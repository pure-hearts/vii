import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  validateProjectName,
  validateTargetDir,
  formatTargetDir,
} from "../src/scaffold/validators";
import * as fsEmpty from "../src/scaffold/fs/empty";
import { existsSync } from "node:fs";

vi.mock("node:fs", () => ({
  existsSync: vi.fn(),
}));

vi.mock("../src/scaffold/fs/empty", () => ({
  isEmpty: vi.fn(),
}));

describe("validators.ts", () => {
  describe("validateProjectName", () => {
    it("合法 NPM 包名应返回 true", () => {
      expect(validateProjectName("my-app")).toBe(true);
      expect(validateProjectName("my_app")).toBe(true);
      expect(validateProjectName("@scope/my-app")).toBe(true);
    });

    it("空包名或非法包名应返回 false", () => {
      expect(validateProjectName("")).toBe(false);
      expect(validateProjectName("My-App")).toBe(false);
      expect(validateProjectName("@scope/")).toBe(false);
      expect(validateProjectName("my app")).toBe(false);
    });
  });

  describe("validateTargetDir", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("目标目录不存在应返回 valid: true", () => {
      vi.mocked(existsSync).mockReturnValue(false);
      const res = validateTargetDir("some-path");
      expect(res).toEqual({ valid: true });
    });

    it("目标目录存在且为空应返回 valid: true", () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(fsEmpty.isEmpty).mockReturnValue(true);
      const res = validateTargetDir("some-path");
      expect(res).toEqual({ valid: true });
    });

    it("目标目录存在且不为空，但设置了 force: true 应返回 valid: true", () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(fsEmpty.isEmpty).mockReturnValue(false);
      const res = validateTargetDir("some-path", true);
      expect(res).toEqual({ valid: true });
    });

    it("目标目录存在且不为空，且 force: false 应返回 valid: false 及错误提示", () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(fsEmpty.isEmpty).mockReturnValue(false);
      const res = validateTargetDir("some-path", false);
      expect(res.valid).toBe(false);
      expect(res.error).toContain("目标目录不为空，请使用 --force 覆盖");
    });
  });

  describe("formatTargetDir", () => {
    it("应当移除末尾的斜杠", () => {
      expect(formatTargetDir("some-path/")).toBe("some-path");
      expect(formatTargetDir("some-path///")).toBe("some-path");
      expect(formatTargetDir("some-path")).toBe("some-path");
    });
  });
});
