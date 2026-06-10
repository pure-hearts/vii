import { describe, it, expect } from "vitest";
import { applyGithubMirror } from "../src/scaffold/download";

describe("scaffold/download.ts applyGithubMirror", () => {
  it("如果 mirror 为空，应返回原始 gitUrl", () => {
    const gitUrl = "https://github.com/vfiee/project-boilerplate.git";
    expect(applyGithubMirror(gitUrl, "")).toBe(gitUrl);
  });

  it("如果是 kkgithub 镜像（自定义，已从内置移除），仍应按 domain 风格替换域名", () => {
    const gitUrl = "https://github.com/vfiee/project-boilerplate.git";
    const mirror = "https://kkgithub.com";
    expect(applyGithubMirror(gitUrl, mirror)).toBe(
      "https://kkgithub.com/vfiee/project-boilerplate.git",
    );
  });

  it("如果是 gitclone 镜像（自定义，已从内置移除），仍应按 domain 风格降级处理", () => {
    // GitClone 已从内置源移除（直连 HTTP 502），但若用户自行配置，
    // 因不在内置表中无法识别 cloneStyle，会退化为 domain 替换
    const gitUrl = "https://github.com/vfiee/project-boilerplate.git";
    const mirror = "https://gitclone.com";
    expect(applyGithubMirror(gitUrl, mirror)).toBe(
      "https://gitclone.com/vfiee/project-boilerplate.git",
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
