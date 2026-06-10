import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { register } from "../src/utils/register";
import { logger } from "../src/utils/logger";
import { initCommand, releaseCommand, listCommand, mirrorCommand } from "../src/commands";

// Mock commands
vi.mock("../src/commands", () => ({
  initCommand: {
    name: "init",
    description: "创建新项目",
    action: vi.fn(),
  },
  releaseCommand: {
    name: "release",
    description: "Release a new version",
    action: vi.fn(),
  },
  listCommand: {
    name: "list",
    description: "List all built-in templates",
    action: vi.fn(),
  },
  mirrorCommand: {
    name: "mirror",
    description: "管理 GitHub 镜像源",
    action: vi.fn(),
  },
}));

describe("CLI register.ts", () => {
  let exitCode: number | undefined;
  let lastErrorMsg = "";
  let consoleLogMock: any;
  let processExitSpy: any;
  let loggerErrorSpy: any;

  beforeEach(() => {
    exitCode = undefined;
    lastErrorMsg = "";

    // Mock process.exit
    processExitSpy = vi.spyOn(process, "exit").mockImplementation((code) => {
      exitCode = code as number;
      throw new Error(`process.exit: ${code}`);
    });

    // Mock logger.error
    loggerErrorSpy = vi.spyOn(logger, "error").mockImplementation((msg) => {
      lastErrorMsg = msg;
    });

    // Mock console.log to avoid logs flooding during tests
    consoleLogMock = vi.spyOn(console, "log").mockImplementation(() => {});

    vi.clearAllMocks();
  });

  afterEach(() => {
    processExitSpy.mockRestore();
    loggerErrorSpy.mockRestore();
    consoleLogMock.mockRestore();
  });

  const runRegister = async (args: string[]) => {
    // 模拟 node args，args 传入的参数通常是 ['node', 'vii', ...cliArgs]
    await register(["node", "vii", ...args]);
  };

  describe("init / create 命令", () => {
    it("vii init - 应以交互模式创建项目", async () => {
      await runRegister(["init"]);
      expect(initCommand.action).toHaveBeenCalledWith({
        projectName: undefined,
        template: undefined,
        targetDir: undefined,
      });
    });

    it("vii create - 应以交互模式创建项目 (alias)", async () => {
      await runRegister(["create"]);
      expect(initCommand.action).toHaveBeenCalledWith({
        projectName: undefined,
        template: undefined,
        targetDir: undefined,
      });
    });

    it("vii init my-project - 应指定目录创建项目", async () => {
      await runRegister(["init", "my-project"]);
      expect(initCommand.action).toHaveBeenCalledWith({
        projectName: "my-project",
        template: undefined,
        targetDir: "./my-project",
      });
    });

    it("vii create my-project -t vue-pc - 应指定目录与模板创建项目", async () => {
      await runRegister(["create", "my-project", "-t", "vue-pc"]);
      expect(initCommand.action).toHaveBeenCalledWith({
        projectName: "my-project",
        template: "vue-pc",
        targetDir: "./my-project",
      });
    });

    it("vii my-project --template vue-pc - 应支持省略 init/create 直接带目录", async () => {
      await runRegister(["my-project", "--template", "vue-pc"]);
      expect(initCommand.action).toHaveBeenCalledWith({
        projectName: "my-project",
        template: "vue-pc",
        targetDir: "./my-project",
      });
    });

    it("vii init 执行失败 - 应当捕获错误并以状态码 1 退出", async () => {
      vi.mocked(initCommand.action).mockRejectedValueOnce(new Error("init mock error"));
      await expect(runRegister(["init"])).rejects.toThrow();
      expect(exitCode).toBe(1);
      expect(lastErrorMsg).toContain("命令执行失败: Error: init mock error");
    });
  });

  describe("release 命令", () => {
    it("vii release - 不带参数时应该以全部默认配置调用", async () => {
      await runRegister(["release"]);
      expect(releaseCommand.action).toHaveBeenCalledWith({});
    });

    it("vii release - 携带所有合法选项", async () => {
      await runRegister([
        "release",
        "--dry-run",
        "--skip-push",
        "--skip-publish",
        "--custom",
        "1.2.3",
      ]);
      expect(releaseCommand.action).toHaveBeenCalledWith({
        dryRun: true,
        skipPush: true,
        skipPublish: true,
        custom: "1.2.3",
      });
    });

    it("vii release --custom=1.2.3 - 应当正确解析等号赋值", async () => {
      await runRegister(["release", "--custom=1.2.3"]);
      expect(releaseCommand.action).toHaveBeenCalledWith({
        custom: "1.2.3",
      });
    });

    it("vii release --custom - 缺少版本号时报错退出", async () => {
      await expect(runRegister(["release", "--custom"])).rejects.toThrow();
      expect(exitCode).toBe(1);
      expect(lastErrorMsg).toContain("选项 --custom 需要指定版本号");
    });

    it("vii release --invalid - 带有不支持的选项时报错退出", async () => {
      await expect(runRegister(["release", "--invalid"])).rejects.toThrow();
      expect(exitCode).toBe(1);
      expect(lastErrorMsg).toContain("不支持的选项: --invalid");
    });

    it("vii release 执行失败 - 应当捕获错误并以状态码 1 退出", async () => {
      vi.mocked(releaseCommand.action).mockRejectedValueOnce(new Error("release mock error"));
      await expect(runRegister(["release"])).rejects.toThrow();
      expect(exitCode).toBe(1);
      expect(lastErrorMsg).toContain("命令执行失败: Error: release mock error");
    });
  });

  describe("list 命令", () => {
    it("vii list - 应当正常调用 list", async () => {
      await runRegister(["list"]);
      expect(listCommand.action).toHaveBeenCalled();
    });

    it("vii list extra-param - 携带参数时报错退出", async () => {
      await expect(runRegister(["list", "extra-param"])).rejects.toThrow();
      expect(exitCode).toBe(1);
      expect(lastErrorMsg).toContain('命令 "list" 不需要任何参数或选项: extra-param');
    });

    it("vii list 执行失败 - 应当捕获错误并以状态码 1 退出", async () => {
      vi.mocked(listCommand.action).mockRejectedValueOnce(new Error("list mock error"));
      await expect(runRegister(["list"])).rejects.toThrow();
      expect(exitCode).toBe(1);
      expect(lastErrorMsg).toContain("命令执行失败: Error: list mock error");
    });
  });

  describe("mirror 命令", () => {
    it("vii mirror - 不带子命令时，应当调用 mirrorCommand 且 subcommand 为 undefined", async () => {
      await runRegister(["mirror"]);
      expect(mirrorCommand.action).toHaveBeenCalledWith({
        subcommand: undefined,
        args: [],
      });
    });

    it("vii mirror list - 应当以 list 调用 mirrorCommand", async () => {
      await runRegister(["mirror", "list"]);
      expect(mirrorCommand.action).toHaveBeenCalledWith({
        subcommand: "list",
        args: [],
      });
    });

    it("vii mirror ls - 应当以 ls 调用 mirrorCommand", async () => {
      await runRegister(["mirror", "ls"]);
      expect(mirrorCommand.action).toHaveBeenCalledWith({
        subcommand: "ls",
        args: [],
      });
    });

    it("vii mirror speed - 应当以 speed 调用 mirrorCommand", async () => {
      await runRegister(["mirror", "speed"]);
      expect(mirrorCommand.action).toHaveBeenCalledWith({
        subcommand: "speed",
        args: [],
      });
    });

    it("vii mirror add - 应当带参数调用 mirrorCommand", async () => {
      await runRegister(["mirror", "add", "custom", "https://github.com.cnpmjs.org"]);
      expect(mirrorCommand.action).toHaveBeenCalledWith({
        subcommand: "add",
        args: ["custom", "https://github.com.cnpmjs.org"],
      });
    });

    it("vii mirror delete - 应当带参数调用 mirrorCommand", async () => {
      await runRegister(["mirror", "delete", "custom"]);
      expect(mirrorCommand.action).toHaveBeenCalledWith({
        subcommand: "delete",
        args: ["custom"],
      });
    });

    it("vii mirror 执行失败 - 应当捕获错误并以状态码 1 退出", async () => {
      vi.mocked(mirrorCommand.action).mockRejectedValueOnce(new Error("mirror mock error"));
      await expect(runRegister(["mirror"])).rejects.toThrow();
      expect(exitCode).toBe(1);
      expect(lastErrorMsg).toContain("命令执行失败: Error: mirror mock error");
    });
  });

  describe("异常拦截与拼写纠错", () => {
    it("vii -t - 缺少模板名称时报错退出", async () => {
      await expect(runRegister(["-t"])).rejects.toThrow();
      expect(exitCode).toBe(1);
      expect(lastErrorMsg).toContain("选项 -t 需要指定模板名称");
    });

    it("vii --invalid-opt - 未知选项应报错退出", async () => {
      await expect(runRegister(["--invalid-opt"])).rejects.toThrow();
      expect(exitCode).toBe(1);
      expect(lastErrorMsg).toContain("不支持的选项: --invalid-opt");
    });

    it("vii dev my-project - 多个位置参数或不支持的子命令应报错退出", async () => {
      await expect(runRegister(["dev", "my-project"])).rejects.toThrow();
      expect(exitCode).toBe(1);
      expect(lastErrorMsg).toContain("不支持的命令或多余的位置参数: dev");
    });

    it("vii releas - 误拼写时提示相似已知命令", async () => {
      await expect(runRegister(["releas"])).rejects.toThrow();
      expect(exitCode).toBe(1);
      expect(lastErrorMsg).toContain('不支持的命令: releas。您是不是想输入 "release"?');
    });

    it("vii lis - 误拼写时提示相似已知命令", async () => {
      await expect(runRegister(["lis"])).rejects.toThrow();
      expect(exitCode).toBe(1);
      expect(lastErrorMsg).toContain('不支持的命令: lis。您是不是想输入 "list"?');
    });

    it("vii mirro - 误拼写时提示相似已知命令", async () => {
      await expect(runRegister(["mirro"])).rejects.toThrow();
      expect(exitCode).toBe(1);
      expect(lastErrorMsg).toContain('不支持的命令: mirro。您是不是想输入 "mirror"?');
    });
  });

  describe("帮助信息", () => {
    it("vii -h - 应该打印帮助信息", async () => {
      await runRegister(["-h"]);
      expect(consoleLogMock).toHaveBeenCalled();
    });
  });
});
