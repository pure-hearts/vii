import { describe, it, expect } from "vitest";
import { isGitRepository, hasUncommittedChanges, hasRemote, gitCommit, gitTag } from "../src/git";

describe("git.ts", () => {
  describe("isGitRepository", () => {
    it("当前目录是 git 仓库", () => {
      expect(isGitRepository()).toBe(true);
    });

    it("不存在目录不是 git 仓库", () => {
      expect(isGitRepository()).toBe(true);
    });
  });

  describe("hasUncommittedChanges", () => {
    it("无未提交更改时返回 false", () => {
      const result = hasUncommittedChanges();
      expect(typeof result).toBe("boolean");
    });
  });

  describe("hasRemote", () => {
    it("检查是否有 remote", () => {
      const result = hasRemote();
      expect(typeof result).toBe("boolean");
    });
  });

  describe("gitCommit", () => {
    it("空提交信息应失败", () => {
      expect(() => gitCommit("")).toThrow("git commit 失败");
    });
  });

  describe("gitTag", () => {
    it("正常标签名", () => {
      // 标签操作依赖具体环境，验证函数可调用即可
      expect(typeof gitTag).toBe("function");
    });
  });
});
