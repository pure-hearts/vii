export interface ReleaseOptions {
  cwd?: string
  dryRun?: boolean
  skipTests?: boolean
  skipPublish?: boolean
  skipPush?: boolean
  releaseAs?: string
  all?: boolean
  package?: string
}

export async function release(options: ReleaseOptions = {}): Promise<void> {
  // TODO: 实现
}
