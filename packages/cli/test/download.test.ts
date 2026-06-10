import { describe, it, expect, vi, beforeEach } from "vitest";
import { downloadTemplate } from "../src/scaffold/download";
import { execSync } from "node:child_process";
import { copyDir } from "../src/scaffold/fs/copy";

// Mock child_process 和 copyDir
vi.mock("node:child_process", () => ({
  execSync: vi.fn(),
}));

vi.mock("../src/scaffold/fs/copy", () => ({
  copyDir: vi.fn(),
}));

describe("scaffold/download.ts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("应成功克隆不带分支的模板，并拷贝文件，最后清理临时目录", async () => {
    await downloadTemplate("github:vfiee/template-vue-pc", "my-target");

    // 第一个 execSync 是 git clone
    // 第二个 execSync 是 rm -rf
    expect(execSync).toHaveBeenCalledTimes(2);

    const firstCallCmd = vi.mocked(execSync).mock.calls[0][0] as string;
    expect(firstCallCmd).toContain(
      "git clone --depth 1 https://github.com/vfiee/template-vue-pc.git",
    );
    expect(firstCallCmd).not.toContain("-b");

    const secondCallCmd = vi.mocked(execSync).mock.calls[1][0] as string;
    expect(secondCallCmd).toContain("rm -rf");

    // copyDir 应该被调用
    expect(copyDir).toHaveBeenCalledTimes(1);
    expect(copyDir).toHaveBeenCalledWith(expect.any(String), "my-target");
  });

  it("应成功克隆带分支的模板，添加 -b 参数，并拷贝文件，最后清理", async () => {
    await downloadTemplate("github:vfiee/project-boilerplate#vue-pc", "my-target");

    expect(execSync).toHaveBeenCalledTimes(2);

    const firstCallCmd = vi.mocked(execSync).mock.calls[0][0] as string;
    expect(firstCallCmd).toContain(
      "git clone --depth 1 -b vue-pc https://github.com/vfiee/project-boilerplate.git",
    );

    const secondCallCmd = vi.mocked(execSync).mock.calls[1][0] as string;
    expect(secondCallCmd).toContain("rm -rf");

    expect(copyDir).toHaveBeenCalledTimes(1);
  });

  it("如果克隆失败，应抛出友好错误，但仍然清理临时目录", async () => {
    vi.mocked(execSync).mockImplementationOnce(() => {
      throw new Error("Git clone timed out");
    });

    await expect(
      downloadTemplate("github:vfiee/project-boilerplate#vue-pc", "my-target"),
    ).rejects.toThrow(/下载模版失败/);

    // 虽然克隆失败，但是 finally 里的 rm -rf 依然需要被执行
    expect(execSync).toHaveBeenCalledTimes(2); // 第一次 clone 抛异常，第二次 rm -rf 应该执行
    const secondCallCmd = vi.mocked(execSync).mock.calls[1][0] as string;
    expect(secondCallCmd).toContain("rm -rf");

    // copyDir 不应该被调用
    expect(copyDir).not.toHaveBeenCalled();
  });
});
