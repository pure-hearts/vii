import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  getConfigPath,
  getCustomMirrors,
  getAllMirrors,
  saveCustomMirrors,
} from "../src/utils/config";
import { existsSync, unlinkSync, writeFileSync } from "node:fs";

describe("utils/config.ts (配置持久化测试)", () => {
  const tempPath = "./temp_test_viirc.json";

  beforeEach(() => {
    process.env.TEMP_VIIRC_PATH = tempPath;
  });

  afterEach(() => {
    delete process.env.TEMP_VIIRC_PATH;
    if (existsSync(tempPath)) {
      unlinkSync(tempPath);
    }
  });

  it("应当根据环境变量返回临时的 config 路径", () => {
    expect(getConfigPath()).toBe(tempPath);
  });

  it("当配置文件不存在时，getCustomMirrors 应返回空列表", () => {
    expect(getCustomMirrors()).toEqual([]);
  });

  it("当配置文件无效时，getCustomMirrors 应优雅降级并返回空列表", () => {
    writeFileSync(tempPath, "invalid-json", "utf-8");
    expect(getCustomMirrors()).toEqual([]);
  });

  it("应当能正确保存和读取自定义镜像源", () => {
    const custom = [{ name: "MyMirror", value: "https://example.com" }];
    saveCustomMirrors(custom);

    expect(existsSync(tempPath)).toBe(true);
    expect(getCustomMirrors()).toEqual(custom);
  });

  it("应当在合并列表时保留 builtin 属性", () => {
    const custom = [{ name: "MyMirror", value: "https://example.com" }];
    saveCustomMirrors(custom);

    const all = getAllMirrors();
    // 内置源现在有 5 个：GitHub, Akams, Gitee, GHProxy, GHFast
    expect(all.length).toBe(6); // 5 内置 + 1 自定义
    expect(all.find((m) => m.name === "GitHub")?.isBuiltin).toBe(true);
    expect(all.find((m) => m.name === "MyMirror")?.isBuiltin).toBe(false);
  });

  it("saveCustomMirrors 写入时应当过滤掉内置镜像源", () => {
    const mixed = [
      { name: "GitHub", value: "https://github.com", isBuiltin: true },
      { name: "MyMirror", value: "https://example.com", isBuiltin: false },
    ];
    saveCustomMirrors(mixed);

    const saved = getCustomMirrors();
    // 写入时应当剔除了内置镜像 GitHub，只留下 MyMirror
    expect(saved.length).toBe(1);
    expect(saved[0].name).toBe("MyMirror");
  });
});
