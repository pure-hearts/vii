import { run } from './run'
import type { ReleaseOptions } from './types'

export async function release(options: ReleaseOptions = {}): Promise<void> {
  await run(options)
}

export { run }
export type { ReleaseOptions } from './types'
export { readPkg, writePkg } from './pkg'
export { calculateNewVersion, isValidVersion } from './version'
