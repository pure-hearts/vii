import { describe, it, expect, vi, beforeEach } from "vitest";
import { isEmpty, emptyDir } from "../src/scaffold/fs/empty";
import { existsSync, readdirSync, rmSync } from "node:fs";

vi.mock("node:fs", () => ({
  existsSync: vi.fn(),
  readdirSync: vi.fn(),
  rmSync: vi.fn(),
}));

describe("fs/empty.ts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("isEmpty", () => {
    it("目录不存在应返回 true", () => {
      vi.mocked(existsSync).mockReturnValue(false);
      expect(isEmpty("some-dir")).toBe(true);
    });

    it("目录存在且无任何文件应返回 true", () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readdirSync).mockReturnValue([] as any);
      expect(isEmpty("some-dir")).toBe(true);
    });

    it("目录仅含有 .git 文件夹应返回 true", () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readdirSync).mockReturnValue([".git"] as any);
      expect(isEmpty("some-dir")).toBe(true);
    });

    it("目录含有其他文件或文件夹应返回 false", () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readdirSync).mockReturnValue(["index.js", ".git"] as any);
      expect(isEmpty("some-dir")).toBe(false);
    });
  });

  describe("emptyDir", () => {
    it("目录不存在应直接返回不进行删除", () => {
      vi.mocked(existsSync).mockReturnValue(false);
      emptyDir("some-dir");
      expect(rmSync).not.toHaveBeenCalled();
    });

    it("应当清空目录内所有文件但保留 .git", () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readdirSync).mockReturnValue(["file1.txt", "dir1", ".git"] as any);
      emptyDir("some-dir");
      expect(rmSync).toHaveBeenCalledTimes(2);
      expect(rmSync).toHaveBeenCalledWith(expect.stringContaining("file1.txt"), {
        recursive: true,
        force: true,
      });
      expect(rmSync).toHaveBeenCalledWith(expect.stringContaining("dir1"), {
        recursive: true,
        force: true,
      });
      expect(rmSync).not.toHaveBeenCalledWith(expect.stringContaining(".git"), expect.any(Object));
    });
  });
});
