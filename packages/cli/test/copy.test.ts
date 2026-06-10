import { describe, it, expect, vi, beforeEach } from "vitest";
import { copyDir } from "../src/scaffold/fs/copy";
import { mkdirSync, readdirSync, copyFileSync } from "node:fs";

vi.mock("node:fs", () => ({
  mkdirSync: vi.fn(),
  readdirSync: vi.fn(),
  copyFileSync: vi.fn(),
}));

describe("fs/copy.ts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("copyDir", () => {
    it("应递归拷贝目录，并且过滤掉 .git 目录", () => {
      // 模拟 readdirSync 在源目录中包含普通文件、子目录和 .git
      vi.mocked(readdirSync).mockImplementation((path: any) => {
        if (path === "src-dir") {
          return [
            { name: "file1.txt", isDirectory: () => false },
            { name: "sub-dir", isDirectory: () => true },
            { name: ".git", isDirectory: () => true },
          ] as any;
        }
        if (path === "src-dir/sub-dir") {
          return [{ name: "file2.txt", isDirectory: () => false }] as any;
        }
        return [];
      });

      copyDir("src-dir", "dest-dir");

      // 断言 mkdirSync 创建了目标目录和子目录
      expect(mkdirSync).toHaveBeenCalledWith("dest-dir", { recursive: true });
      expect(mkdirSync).toHaveBeenCalledWith("dest-dir/sub-dir", { recursive: true });

      // 断言文件被正确拷贝
      expect(copyFileSync).toHaveBeenCalledWith("src-dir/file1.txt", "dest-dir/file1.txt");
      expect(copyFileSync).toHaveBeenCalledWith(
        "src-dir/sub-dir/file2.txt",
        "dest-dir/sub-dir/file2.txt",
      );

      // 断言 .git 目录根本没有被拷贝，也没有调用对应的 mkdir 或 readdir
      expect(mkdirSync).not.toHaveBeenCalledWith("dest-dir/.git", expect.any(Object));
      expect(copyFileSync).not.toHaveBeenCalledWith(
        expect.stringContaining(".git"),
        expect.any(String),
      );
    });
  });
});
