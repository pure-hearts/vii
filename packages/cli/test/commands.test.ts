import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { listCommand } from "../src/commands/list";
import { releaseCommand } from "../src/commands/release";
import { initCommand } from "../src/commands/init";
import { release } from "../../release/src/index.js";
import { promptProjectName, promptTemplate, promptMirror } from "../src/prompts";
import { scaffold } from "../src/scaffold";

// Mock commands dependencies
vi.mock("../../release/src/index.js", () => ({
  release: vi.fn(),
}));

vi.mock("../src/prompts", () => ({
  promptProjectName: vi.fn(),
  promptTemplate: vi.fn(),
  promptMirror: vi.fn(),
  BUILTIN_TEMPLATES: [{ name: "vue-pc", value: "vue-pc", description: "Vue 3 PC Template" }],
}));

vi.mock("../src/scaffold", () => ({
  scaffold: vi.fn(),
}));

describe("CLI Commands", () => {
  let consoleLogMock: any;

  beforeEach(() => {
    consoleLogMock = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.clearAllMocks();
  });

  afterEach(() => {
    consoleLogMock.mockRestore();
  });

  describe("listCommand", () => {
    it("应当打印出可用模板列表", async () => {
      await listCommand.action();
      expect(consoleLogMock).toHaveBeenCalled();
      const calls = consoleLogMock.mock.calls.map((c: any) => c[0] as string);
      expect(calls.some((c: string) => c && c.includes("可用项目模板列表"))).toBe(true);
      expect(calls.some((c: string) => c && c.includes("vue-pc"))).toBe(true);
    });
  });

  describe("releaseCommand", () => {
    it("应当正确调用外部 release 函数并传参", async () => {
      const options = { dryRun: true, custom: "1.0.0" };
      await releaseCommand.action(options);
      expect(release).toHaveBeenCalledWith(options);
    });
  });

  describe("initCommand", () => {
    it("直接提供所有参数时应无需 prompt 直接执行 scaffold", async () => {
      const options = {
        projectName: "my-project",
        template: "vue-pc",
        targetDir: "./my-project",
        force: false,
        mirror: "https://kkgithub.com",
      };
      await initCommand.action(options);
      expect(promptProjectName).not.toHaveBeenCalled();
      expect(promptTemplate).not.toHaveBeenCalled();
      expect(promptMirror).not.toHaveBeenCalled();
      expect(scaffold).toHaveBeenCalledWith({
        projectName: "my-project",
        template: "vue-pc",
        targetDir: "./my-project",
        force: false,
        mirror: "https://kkgithub.com",
      });
    });

    it("若没有提供 projectName 且 prompt 返回空，则取消操作", async () => {
      vi.mocked(promptProjectName).mockResolvedValueOnce("");
      await initCommand.action({});
      expect(promptProjectName).toHaveBeenCalled();
      expect(consoleLogMock).toHaveBeenCalledWith(expect.stringContaining("操作已取消"));
      expect(scaffold).not.toHaveBeenCalled();
    });

    it("若没有提供 template 且 prompt 返回空，则取消操作", async () => {
      vi.mocked(promptProjectName).mockResolvedValueOnce("my-project");
      vi.mocked(promptTemplate).mockResolvedValueOnce("");
      await initCommand.action({});
      expect(promptProjectName).toHaveBeenCalled();
      expect(promptTemplate).toHaveBeenCalled();
      expect(consoleLogMock).toHaveBeenCalledWith(expect.stringContaining("操作已取消"));
      expect(scaffold).not.toHaveBeenCalled();
    });

    it("交互式收集完参数后应成功执行 scaffold", async () => {
      vi.mocked(promptProjectName).mockResolvedValueOnce("my-project");
      vi.mocked(promptTemplate).mockResolvedValueOnce("vue-pc");
      vi.mocked(promptMirror).mockResolvedValueOnce("https://kkgithub.com");
      await initCommand.action({});
      expect(promptProjectName).toHaveBeenCalled();
      expect(promptTemplate).toHaveBeenCalled();
      expect(promptMirror).toHaveBeenCalled();
      expect(scaffold).toHaveBeenCalledWith({
        projectName: "my-project",
        template: "vue-pc",
        targetDir: "./my-project",
        force: false,
        mirror: "https://kkgithub.com",
      });
    });
  });
});
