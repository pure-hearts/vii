import { describe, it, expect } from "vitest";
import { applyGithubMirror } from "../src/scaffold/download";

describe("scaffold/download.ts applyGithubMirror", () => {
  it("如果 mirror 为空，应返回原始 gitUrl", () => {
    const gitUrl = "https://github.com/vfiee/project-boilerplate.git";
    expect(applyGithubMirror(gitUrl, "")).toBe(gitUrl);
  });

  it("如果是 kkgithub 镜像，应替换 github.com 域名", () => {
    const gitUrl = "https://github.com/vfiee/project-boilerplate.git";
    const mirror = "https://kkgithub.com";
    expect(applyGithubMirror(gitUrl, mirror)).toBe(
      "https://kkgithub.com/vfiee/project-boilerplate.git",
    );
  });

  it("如果是 gitclone 镜像，应使用其特殊的 github.com 路径规则", () => {
    const gitUrl = "https://github.com/vfiee/project-boilerplate.git";
    const mirror = "https://gitclone.com";
    expect(applyGithubMirror(gitUrl, mirror)).toBe(
      "https://gitclone.com/github.com/vfiee/project-boilerplate.git",
    );
  });

  it("如果输入了自定义的 http 镜像，也应替换 github.com 域名", () => {
    const gitUrl = "https://github.com/vfiee/project-boilerplate.git";
    const mirror = "https://custom-mirror.org/";
    expect(applyGithubMirror(gitUrl, mirror)).toBe(
      "https://custom-mirror.org/vfiee/project-boilerplate.git",
    );
  });

  it("如果输入的镜像没有包含 https 协议，应自动补齐", () => {
    const gitUrl = "https://github.com/vfiee/project-boilerplate.git";
    const mirror = "kkgithub.com";
    expect(applyGithubMirror(gitUrl, mirror)).toBe(
      "https://kkgithub.com/vfiee/project-boilerplate.git",
    );
  });

  it("如果 gitUrl 不以 https://github.com 开头，应返回原始地址", () => {
    const gitUrl = "git@github.com:vfiee/project-boilerplate.git";
    const mirror = "https://kkgithub.com";
    expect(applyGithubMirror(gitUrl, mirror)).toBe(gitUrl);
  });
});
