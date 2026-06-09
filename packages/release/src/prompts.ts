import prompts from 'prompts'
import { calculateNewVersion } from './version'

/**
 * 交互式选择发布类型
 */
export async function promptReleaseType(
  currentVersion: string,
): Promise<string> {
  const versions = {
    patch: calculateNewVersion(currentVersion, 'patch'),
    minor: calculateNewVersion(currentVersion, 'minor'),
    major: calculateNewVersion(currentVersion, 'major'),
  }

  const { type } = await prompts({
    type: 'select',
    name: 'type',
    message: '选择发布类型:',
    choices: [
      { value: 'patch', title: `Patch (bugfix) → ${versions.patch}` },
      { value: 'minor', title: `Minor (新功能) → ${versions.minor}` },
      { value: 'major', title: `Major (破坏性更新) → ${versions.major}` },
      { value: 'custom', title: '自定义版本' },
    ],
  })

  if (type === 'custom') {
    const { version } = await prompts({
      type: 'text',
      name: 'version',
      message: '输入版本号:',
      hint: currentVersion,
      initial: '',
    })
    return version || currentVersion
  }

  return type
}
