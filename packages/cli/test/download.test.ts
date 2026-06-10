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
