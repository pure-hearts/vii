import { initCommand, releaseCommand, listCommand } from "../commands";

interface Command<T = object> {
  name: string;
  description: string;
  action: (options: T) => Promise<void>;
}

const commands: Command[] = [initCommand, releaseCommand, listCommand];

/**
 * 注册命令并执行
 */
export async function register(args: string[]): Promise<void> {
  const [commandName] = args.slice(2); // 跳过 node 和脚本路径

  const command = commands.find((c) => c.name === commandName);

  if (!command) {
    console.log("\n未知命令或参数为空。");
    console.log('请运行 "vii list" 查看可用的项目模板列表。\n');
    return;
  }

  try {
    await command.action({});
  } catch (error) {
    console.error(`命令执行失败: ${error}`);
    process.exit(1);
  }
}
