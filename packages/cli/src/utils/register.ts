import { initCommand } from '../commands/init'
import { releaseCommand } from '../commands/release'

interface Command {
  name: string
  description: string
  action: (options: unknown) => Promise<void>
}

const commands: Command[] = [initCommand, releaseCommand]

/**
 * 注册命令并执行
 */
export async function register(args: string[]): Promise<void> {
  const [commandName] = args.slice(2) // 跳过 node 和脚本路径

  const command = commands.find((c) => c.name === commandName)

  if (!command) {
    console.log('可用命令:')
    for (const cmd of commands) {
      console.log(`  ${cmd.name} - ${cmd.description}`)
    }
    return
  }

  try {
    await command.action({})
  } catch (error) {
    console.error(`命令执行失败: ${error}`)
    process.exit(1)
  }
}

export { register }
