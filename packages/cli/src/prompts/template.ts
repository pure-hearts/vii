import prompts from 'prompts'

// 内置模板列表
export const BUILTIN_TEMPLATES = [
  {
    name: 'vue',
    value: 'github:vfiee/template-vue',
    description: 'Vue 3 + Vite',
  },
  {
    name: 'react',
    value: 'github:vfiee/template-react',
    description: 'React 18 + Vite',
  },
  {
    name: 'node',
    value: 'github:vfiee/template-node',
    description: 'Node.js CLI',
  },
]

/**
 * 询问模板选择
 */
export async function promptTemplate(): Promise<string> {
  const { template } = await prompts({
    type: 'select',
    name: 'template',
    message: '选择模板:',
    choices: BUILTIN_TEMPLATES.map((t) => ({
      value: t.value,
      title: `${t.name} - ${t.description}`,
    })),
  })

  return template
}
