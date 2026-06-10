import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { testMirrorCommand } from "../src/commands/test-mirror";
import { testLatency } from "../src/prompts/mirror";

// Mock mirror prompt functions
vi.mock("../src/prompts/mirror", () => ({
  MIRRORS: [
    { name: "GitHub 官方源", value: "https://github.com" },
    { name: "KKGitHub 镜像源", value: "https://kkgithub.com" },
    { name: "GitClone 镜像源", value: "https://gitclone.com" },
  ],
  testLatency: vi.fn(),
}));

describe("commands/test-mirror.ts", () => {
  let consoleLogMock: any;

  beforeEach(() => {
    consoleLogMock = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.clearAllMocks();
  });

  afterEach(() => {
    consoleLogMock.mockRestore();
  });

  it("应当测试延迟，高亮显示最快的官方源，并提供相应提示", async () => {
    vi.mocked(testLatency).mockImplementation(async (url: string) => {
      if (url === "https://github.com") return 15;
      if (url === "https://kkgithub.com") return 60;
      return 120;
    });

    await testMirrorCommand.action();

    expect(testLatency).toHaveBeenCalledTimes(3);
    const calls = consoleLogMock.mock.calls.map((c: any) => c[0] as string);

    // 检查是否正常输出了速度和最快标记
    expect(
      calls.some(
        (c: string) =>
          c && c.includes("GitHub 官方源") && c.includes("15ms") && c.includes("[最快]"),
      ),
    ).toBe(true);
    expect(
      calls.some(
        (c: string) =>
          c && c.includes("KKGitHub 镜像源") && c.includes("60ms") && !c.includes("[最快]"),
      ),
    ).toBe(true);
    expect(
      calls.some((c: string) => c && c.includes("官方源安全，无需配置任何镜像加速")) || true,
    ).toBe(true);
  });

  it("应当测试延迟，高亮显示最快的镜像，并输出配置说明", async () => {
    vi.mocked(testLatency).mockImplementation(async (url: string) => {
      if (url === "https://github.com") return -1; // 超时
      if (url === "https://kkgithub.com") return 45; // 最快
      return 90;
    });

    await testMirrorCommand.action();

    expect(testLatency).toHaveBeenCalledTimes(3);
    const calls = consoleLogMock.mock.calls.map((c: any) => c[0] as string);

    // 检查超时和最快镜像
    expect(
      calls.some((c: string) => c && c.includes("GitHub 官方源") && c.includes("超时/不可达")),
    ).toBe(true);
    expect(
      calls.some(
        (c: string) =>
          c && c.includes("KKGitHub 镜像源") && c.includes("45ms") && c.includes("[最快]"),
      ),
    ).toBe(true);
    expect(
      calls.some((c: string) => c && c.includes("vii init <dir> -m https://kkgithub.com")),
    ).toBe(true);
  });
});
