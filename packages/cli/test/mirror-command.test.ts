import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mirrorCommand } from "../src/commands/mirror";
import { getAllMirrors, saveCustomMirrors, getCustomMirrors } from "../src/utils/config";
import { testLatency } from "../src/prompts/mirror";
import { logger } from "../src/utils";

vi.mock("../src/utils/config", () => ({
  getAllMirrors: vi.fn(),
  getCustomMirrors: vi.fn(),
  saveCustomMirrors: vi.fn(),
}));

vi.mock("../src/prompts/mirror", () => ({
  testLatency: vi.fn(),
}));

describe("commands/mirror.ts (镜像管理命令接口测试)", () => {
  let consoleLogMock: any;
  let processExitSpy: any;
  let loggerErrorSpy: any;
  let loggerSuccessSpy: any;

  beforeEach(() => {
    consoleLogMock = vi.spyOn(console, "log").mockImplementation(() => {});
    processExitSpy = vi.spyOn(process, "exit").mockImplementation((code) => {
      throw new Error(`process.exit: ${code}`);
    });
    loggerErrorSpy = vi.spyOn(logger, "error").mockImplementation(() => {});
    loggerSuccessSpy = vi.spyOn(logger, "success").mockImplementation(() => {});
    vi.clearAllMocks();
  });

  afterEach(() => {
    consoleLogMock.mockRestore();
    processExitSpy.mockRestore();
    loggerErrorSpy.mockRestore();
    loggerSuccessSpy.mockRestore();
  });

  it("mirror list - 应当正确列出所有已有镜像源", async () => {
    vi.mocked(getAllMirrors).mockReturnValueOnce([
      { name: "GitHub", value: "https://github.com", isBuiltin: true },
      { name: "MyMirror", value: "https://example.com", isBuiltin: false },
    ]);

    await mirrorCommand.action({ subcommand: "list" });

    expect(getAllMirrors).toHaveBeenCalled();
    const calls = consoleLogMock.mock.calls.map((c: any) => c[0] as string);
    expect(calls.some((c: string) => c && c.includes("GitHub") && c.includes("[内置]"))).toBe(true);
    expect(calls.some((c: string) => c && c.includes("MyMirror") && c.includes("[自定义]"))).toBe(
      true,
    );
  });

  it("mirror speed - 应当测试延迟并高亮最快者", async () => {
    vi.mocked(getAllMirrors).mockReturnValueOnce([
      { name: "GitHub", value: "https://github.com", isBuiltin: true },
      { name: "MyMirror", value: "https://example.com", isBuiltin: false },
    ]);

    vi.mocked(testLatency).mockImplementation(async (url) => {
      if (url === "https://github.com") return 150;
      return 45; // 最快
    });

    await mirrorCommand.action({ subcommand: "speed" });

    expect(testLatency).toHaveBeenCalledTimes(2);
    const logCalls = consoleLogMock.mock.calls.map((c: any) => c[0] as string);
    expect(logCalls.some((c: string) => c && c.includes("GitHub") && c.includes("150ms"))).toBe(
      true,
    );
    expect(
      logCalls.some(
        (c: string) => c && c.includes("MyMirror") && c.includes("45ms") && c.includes("[最快]"),
      ),
    ).toBe(true);
    expect(loggerSuccessSpy).toHaveBeenCalledWith("💡 推荐使用: MyMirror");
  });

  it("mirror add - 成功验证并保存镜像源", async () => {
    vi.mocked(getAllMirrors).mockReturnValueOnce([
      { name: "GitHub", value: "https://github.com", isBuiltin: true },
    ]);
    vi.mocked(getCustomMirrors).mockReturnValueOnce([]);

    await mirrorCommand.action({ subcommand: "add", args: ["MyMirror", "https://example.com"] });

    expect(saveCustomMirrors).toHaveBeenCalledWith([
      { name: "MyMirror", value: "https://example.com" },
    ]);
    expect(loggerSuccessSpy).toHaveBeenCalledWith(
      expect.stringContaining("成功添加镜像源: MyMirror"),
    );
  });

  it("mirror add - 遇到无效 URL 应当报错退出", async () => {
    await expect(
      mirrorCommand.action({ subcommand: "add", args: ["MyMirror", "invalid-url"] }),
    ).rejects.toThrow();

    expect(loggerErrorSpy).toHaveBeenCalledWith(expect.stringContaining("无效的镜像 URL"));
    expect(saveCustomMirrors).not.toHaveBeenCalled();
  });

  it("mirror add - 遇到同名应当报错退出", async () => {
    vi.mocked(getAllMirrors).mockReturnValueOnce([
      { name: "GitHub", value: "https://github.com", isBuiltin: true },
    ]);

    await expect(
      mirrorCommand.action({ subcommand: "add", args: ["GitHub", "https://example.com"] }),
    ).rejects.toThrow();

    expect(loggerErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('镜像源名称 "GitHub" 已存在'),
    );
  });

  it("mirror delete - 拒绝删除内置源并报错", async () => {
    vi.mocked(getAllMirrors).mockReturnValueOnce([
      { name: "GitHub", value: "https://github.com", isBuiltin: true },
    ]);

    await expect(
      mirrorCommand.action({ subcommand: "delete", args: ["GitHub"] }),
    ).rejects.toThrow();

    expect(loggerErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('内置镜像源 "GitHub" 不允许删除'),
    );
    expect(saveCustomMirrors).not.toHaveBeenCalled();
  });

  it("mirror delete - 成功删除自定义镜像源", async () => {
    vi.mocked(getAllMirrors).mockReturnValueOnce([
      { name: "GitHub", value: "https://github.com", isBuiltin: true },
      { name: "MyMirror", value: "https://example.com", isBuiltin: false },
    ]);
    vi.mocked(getCustomMirrors).mockReturnValueOnce([
      { name: "MyMirror", value: "https://example.com" },
    ]);

    await mirrorCommand.action({ subcommand: "delete", args: ["MyMirror"] });

    expect(saveCustomMirrors).toHaveBeenCalledWith([]);
    expect(loggerSuccessSpy).toHaveBeenCalledWith(
      expect.stringContaining("成功删除镜像源: MyMirror"),
    );
  });
});
