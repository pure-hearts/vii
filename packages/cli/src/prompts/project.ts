import prompts from 'prompts'
import { validateProjectName } from '../scaffold/validators'

/**
 * 询问项目名
 */
export async function promptProjectName(): Promise<string> {
  const { name } = await prompts({
    type: 'text',
    name: 'name',
    message: '项目名称:',
    validate: (value: string) =>
      validateProjectName(value) || '无效的项目名（需符合 NPM 包名规范）',
  })

  return name
}
