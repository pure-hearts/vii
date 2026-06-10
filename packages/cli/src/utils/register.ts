import { initCommand, releaseCommand, listCommand, testMirrorCommand } from "../commands";
import { logger } from "./logger";

interface Command<T = object> {
  name: string;
  description: string;
  action: (options: T) => Promise<void>;
}

const commands: Command[] = [initCommand, releaseCommand, listCommand, testMirrorCommand];

// 计算编辑距离，用于模糊匹配拼写错误
function getEditDistance(a: string, b: string): number {
  const matrix = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // 替换
          matrix[i][j - 1] + 1, // 插入
          matrix[i - 1][j] + 1, // 删除
        );
      }
    }
  }
  return matrix[a.length][b.length];
}

/**
 * 注册命令并执行
 */
export async function register(args: string[]): Promise<void> {
  let cliArgs = args.slice(2);
  const originalFirstArg = cliArgs[0];

  // 1. 兼容子命令：release
  if (originalFirstArg === "release") {
    const releaseOptions: any = {};
    const releaseArgs = cliArgs.slice(1);
    for (let i = 0; i < releaseArgs.length; i++) {
      const arg = releaseArgs[i];
      if (arg === "--dryRun") {
        releaseOptions.dryRun = true;
      } else if (arg === "--skipPush") {
        releaseOptions.skipPush = true;
      } else if (arg === "--skipPublish") {
        releaseOptions.skipPublish = true;
      } else if (arg === "--releaseAs") {
        const nextVal = releaseArgs[i + 1];
        if (nextVal && !nextVal.startsWith("-")) {
          releaseOptions.releaseAs = nextVal;
          i++;
        } else {
          logger.error(`选项 --releaseAs 需要指定版本号`);
          process.exit(1);
        }
      } else if (arg.startsWith("--releaseAs=")) {
        releaseOptions.releaseAs = arg.split("=")[1];
      } else {
        logger.error(`不支持的选项或参数: ${arg}`);
        process.exit(1);
      }
    }

    const releaseCmd = commands.find((c) => c.name === "release");
    if (releaseCmd) {
      try {
        await releaseCmd.action(releaseOptions);
      } catch (error) {
        logger.error(`命令执行失败: ${error}`);
        process.exit(1);
      }
      return;
    }
  }

  // 2. 兼容子命令：list
  if (originalFirstArg === "list") {
    const listArgs = cliArgs.slice(1);
    if (listArgs.length > 0) {
      logger.error(`命令 "list" 不需要任何参数或选项: ${listArgs.join(" ")}`);
      process.exit(1);
    }
    const listCmd = commands.find((c) => c.name === "list");
    if (listCmd) {
      try {
        await listCmd.action({});
      } catch (error) {
        logger.error(`命令执行失败: ${error}`);
        process.exit(1);
      }
      return;
    }
  }

  // 2.5 兼容子命令：test-mirror 或 speed
  if (originalFirstArg === "test-mirror" || originalFirstArg === "speed") {
    const testMirrorArgs = cliArgs.slice(1);
    if (testMirrorArgs.length > 0) {
      logger.error(`命令 "${originalFirstArg}" 不需要任何参数或选项: ${testMirrorArgs.join(" ")}`);
      process.exit(1);
    }
    const testMirrorCmd = commands.find((c) => c.name === "test-mirror");
    if (testMirrorCmd) {
      try {
        await testMirrorCmd.action({});
      } catch (error) {
        logger.error(`命令执行失败: ${error}`);
        process.exit(1);
      }
      return;
    }
  }

  // 3. 剥离可选的创建前缀 init 或 create
  if (originalFirstArg === "init" || originalFirstArg === "create") {
    cliArgs = cliArgs.slice(1);
  } else if (originalFirstArg && !originalFirstArg.startsWith("-")) {
    // 模糊匹配已知命令（防呆纠错），如 "releas" 提示 "release"
    const knownCommands = ["init", "create", "release", "list", "test-mirror", "speed"];
    for (const cmd of knownCommands) {
      if (getEditDistance(originalFirstArg, cmd) <= 1) {
        logger.error(`不支持的命令: ${originalFirstArg}。您是不是想输入 "${cmd}"?`);
        process.exit(1);
      }
    }
  }

  // 4. 解析 options 与位置参数
  let template: string | undefined;
  let mirror: string | undefined;
  let directory: string | undefined;
  let isHelp = false;
  const positionalArgs: string[] = [];

  for (let i = 0; i < cliArgs.length; i++) {
    const arg = cliArgs[i];
    if (arg === "-h" || arg === "--help" || arg === "help") {
      isHelp = true;
    } else if (arg === "-t" || arg === "--template") {
      const nextVal = cliArgs[i + 1];
      if (nextVal && !nextVal.startsWith("-")) {
        template = nextVal;
        i++;
      } else {
        logger.error(`选项 ${arg} 需要指定模板名称`);
        process.exit(1);
      }
    } else if (arg === "-m" || arg === "--mirror") {
      const nextVal = cliArgs[i + 1];
      if (nextVal && !nextVal.startsWith("-")) {
        mirror = nextVal;
        i++;
      } else {
        logger.error(`选项 ${arg} 需要指定 GitHub 镜像地址`);
        process.exit(1);
      }
    } else if (arg.startsWith("-")) {
      logger.error(`不支持的选项: ${arg}`);
      process.exit(1);
    } else {
      positionalArgs.push(arg);
    }
  }

  if (positionalArgs.length > 1) {
    logger.error(`不支持的命令或多余的位置参数: ${positionalArgs[0]}`);
    process.exit(1);
  } else if (positionalArgs.length === 1) {
    directory = positionalArgs[0];
  }

  // 5. 打印帮助信息
  if (isHelp) {
    console.log(`Usage: vii [OPTION]... [DIRECTORY]
       vii init [OPTION]... [DIRECTORY]
       vii create [OPTION]... [DIRECTORY]

Create a new project in JavaScript or TypeScript.
With no arguments, start the CLI in interactive mode.

Commands:
  init                       Create a new project (optional)
  create                     Create a new project (alias for init)
  release                    Release a new version
  list                       List all built-in templates
  test-mirror                测试 GitHub 镜像源延迟 (别名: speed)

Options:
  -t, --template NAME        use a specific template
  -m, --mirror URL           use a specific github mirror for cloning`);
    return;
  }

  // 6. 执行主任务（创建项目）
  const initCmd = commands.find((c) => c.name === "init");
  if (initCmd) {
    try {
      await initCmd.action({
        projectName: directory,
        template: template,
        targetDir: directory ? `./${directory}` : undefined,
        mirror: mirror,
      });
    } catch (error) {
      logger.error(`命令执行失败: ${error}`);
      process.exit(1);
    }
  }
}
