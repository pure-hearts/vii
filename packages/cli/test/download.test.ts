import { describe, it, expect, vi, beforeEach } from "vitest";
import { downloadTemplate } from "../src/scaffold/download";
import { execSync, spawn } from "node:child_process";
import { copyDir } from "../src/scaffold/fs/copy";
import { EventEmitter } from "node:events";

// Mock child_process 和 copyDir
vi.mock("node:child_process", () => {
  const EventEmitter = require("node:events").EventEmitter;
  const mockSpawn = vi.fn().mockImplementation(() => {
    const processMock = new EventEmitter() as any;
    processMock.stderr = new EventEmitter();
    processMock.kill = vi.fn();

    process.nextTick(() => {
      processMock.emit("close", 0);
    });

    return processMock;
  });

  return {
    execSync: vi.fn(),
    spawn: mockSpawn,
  };
});

vi.mock("../src/scaffold/fs/copy", () => ({
  copyDir: vi.fn(),
}));

// Mock ora 库
vi.mock("ora", () => {
  const mockSpinner = {
    start: vi.fn().mockReturnThis(),
    succeed: vi.fn().mockReturnThis(),
    fail: vi.fn().mockReturnThis(),
    warn: vi.fn().mockReturnThis(),
    stop: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
  };

  return {
    default: vi.fn().mockReturnValue(mockSpinner),
  };
});

describe("scaffold/download.ts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("应成功克隆不带分支的模板，并拷贝文件，最后清理临时目录", async () => {
    await downloadTemplate("github:vfiee/template-vue-pc", "my-target");

    // spawn 负责 git clone
    expect(spawn).toHaveBeenCalledTimes(1);
    const cloneCmd = vi.mocked(spawn).mock.calls[0][0] as string;
    expect(cloneCmd).toContain(
      "git clone --progress --depth 1 https://github.com/vfiee/template-vue-pc.git",
    );
    expect(cloneCmd).not.toContain("-b");

    // execSync 负责 rm -rf 清理临时文件夹
    expect(execSync).toHaveBeenCalledTimes(1);
    const cleanCmd = vi.mocked(execSync).mock.calls[0][0] as string;
    expect(cleanCmd).toContain("rm -rf");

    // copyDir 应该被调用
    expect(copyDir).toHaveBeenCalledTimes(1);
    expect(copyDir).toHaveBeenCalledWith(expect.any(String), "my-target");
  });

  it("应成功克隆带分支的模板，添加 -b 参数，并拷贝文件，最后清理", async () => {
    await downloadTemplate("github:vfiee/project-boilerplate#vue-pc", "my-target");

    expect(spawn).toHaveBeenCalledTimes(1);
    const cloneCmd = vi.mocked(spawn).mock.calls[0][0] as string;
    expect(cloneCmd).toContain(
      "git clone --progress --depth 1 -b vue-pc https://github.com/vfiee/project-boilerplate.git",
    );

    expect(execSync).toHaveBeenCalledTimes(1);
    const cleanCmd = vi.mocked(execSync).mock.calls[0][0] as string;
    expect(cleanCmd).toContain("rm -rf");

    expect(copyDir).toHaveBeenCalledTimes(1);
  });

  it("如果克隆失败，应抛出友好错误，但仍然清理临时目录", async () => {
    vi.mocked(spawn).mockImplementationOnce(() => {
      const processMock = new EventEmitter() as any;
      processMock.stderr = new EventEmitter();
      processMock.kill = vi.fn();

      process.nextTick(() => {
        processMock.stderr.emit("data", Buffer.from("fatal: could not resolve host"));
        processMock.emit("close", 1);
      });

      return processMock;
    });

    await expect(
      downloadTemplate("github:vfiee/project-boilerplate#vue-pc", "my-target"),
    ).rejects.toThrow(/下载模版失败/);

    // 虽然克隆失败，但是 finally 里的 rm -rf 依然需要被执行
    expect(execSync).toHaveBeenCalledTimes(1);
    const cleanCmd = vi.mocked(execSync).mock.calls[0][0] as string;
    expect(cleanCmd).toContain("rm -rf");

    // copyDir 不应该被调用
    expect(copyDir).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// applyGithubMirror / parseGithubRepo 单元测试（纯函数，无网络，无 mock 依赖）
// ─────────────────────────────────────────────────────────────────────────────
import {
  applyGithubMirror,
  parseGithubRepo,
  getRepoLabel,
  getMirrorName,
} from "../src/scaffold/download";

const VUE_URL = "https://github.com/vuejs/vue.git";

describe("parseGithubRepo", () => {
  it("解析标准 https github URL", () => {
    expect(parseGithubRepo(VUE_URL)).toEqual({ owner: "vuejs", repo: "vue" });
  });

  it("解析不带 .git 后缀的 URL", () => {
    expect(parseGithubRepo("https://github.com/owner/repo")).toEqual({
      owner: "owner",
      repo: "repo",
    });
  });

  it("返回 null 当 URL 不含 github 路径时", () => {
    expect(parseGithubRepo("https://example.com/foo")).toBeNull();
  });
});

describe("applyGithubMirror — 五种转换规则", () => {
  it("gitclone 已从内置移除，自定义使用时按 domain 风格降级", () => {
    // GitClone 已从内置表移除（HTTP 502），若用户自行配置则退化为 domain 替换
    const result = applyGithubMirror(VUE_URL, "https://gitclone.com");
    expect(result).toBe("https://gitclone.com/vuejs/vue.git");
  });

  it("prefix 风格 (gh-proxy) — 正确拼接前缀代理", () => {
    const result = applyGithubMirror(VUE_URL, "https://gh-proxy.com");
    expect(result).toBe("https://gh-proxy.com/https://github.com/vuejs/vue.git");
  });

  it("prefix 风格 (akams) — 正确拼接前缀代理", () => {
    const result = applyGithubMirror(VUE_URL, "https://github.akams.cn");
    expect(result).toBe("https://github.akams.cn/https://github.com/vuejs/vue.git");
  });

  it("prefix 风格 (ghfast) — 正确拼接前缀代理", () => {
    const result = applyGithubMirror(VUE_URL, "https://ghfast.top");
    expect(result).toBe("https://ghfast.top/https://github.com/vuejs/vue.git");
  });

  it("gitee 风格 — 仅保留 repo，owner 固定为 mirrors", () => {
    const result = applyGithubMirror(VUE_URL, "https://gitee.com/mirrors");
    expect(result).toBe("https://gitee.com/mirrors/vue.git");
  });

  it("domain 风格 (kkgithub) — 直接替换域名", () => {
    const result = applyGithubMirror(VUE_URL, "https://kkgithub.com");
    expect(result).toBe("https://kkgithub.com/vuejs/vue.git");
  });

  it("空 mirror 时原样返回", () => {
    expect(applyGithubMirror(VUE_URL, "")).toBe(VUE_URL);
  });
});

describe("getMirrorName — 内置源名称匹配", () => {
  it("无镜像时返回 '官方源'", () => {
    expect(getMirrorName()).toBe("官方源");
    expect(getMirrorName(undefined)).toBe("官方源");
  });

  it("KKGitHub 已移除，作为自定义源时返回 hostname", () => {
    // KKGitHub 已从内置表移除（HTTP 404），现在匹配不到，回退到 hostname
    expect(getMirrorName("https://kkgithub.com")).toBe("kkgithub.com");
  });

  it("GitClone 已移除，作为自定义源时返回 hostname", () => {
    // GitClone 已从内置表移除（HTTP 502），现在匹配不到，回退到 hostname
    expect(getMirrorName("https://gitclone.com")).toBe("gitclone.com");
  });

  it("识别 GHProxy", () => {
    expect(getMirrorName("https://gh-proxy.com")).toBe("GHProxy");
  });

  it("识别 Akams", () => {
    expect(getMirrorName("https://github.akams.cn")).toBe("Akams");
  });

  it("识别 GHFast", () => {
    expect(getMirrorName("https://ghfast.top")).toBe("GHFast");
  });

  it("识别 Gitee", () => {
    expect(getMirrorName("https://gitee.com/mirrors")).toBe("Gitee");
  });

  it("未知镜像时返回 hostname", () => {
    expect(getMirrorName("https://my-mirror.example.com")).toBe("my-mirror.example.com");
  });
});

describe("getRepoLabel", () => {
  it("提取 owner/repo", () => {
    expect(getRepoLabel(VUE_URL)).toBe("vuejs/vue");
  });
  it("非 github URL 时提取最后两段路径（通用正则行为）", () => {
    // getRepoLabel 的正则 /[:/]([^/]+)\/([^/]+)$/ 会匹配最后两段，
    // 对于 https://example.com/foo/bar 会返回 "foo/bar"
    expect(getRepoLabel("https://example.com/foo/bar")).toBe("foo/bar");
  });
  it("完全没有路径分隔符时返回 '项目模板'", () => {
    expect(getRepoLabel("https://example.com")).toBe("项目模板");
  });
});
