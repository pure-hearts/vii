# Quality Guidelines in @vyron/cli

> Code standards, validation rules, and forbidden patterns.

---

## Code Standards

To keep the CLI zero-dependency outside `prompts`, the following quality standards are enforced:

- **No heavy CLI parsers**: Use direct positional argument parsing in `register.ts` using whitelist logic. Do not install heavy argument parsers like commander or yargs.
- **Strict Whitelists**: Reject all unrecognized options and command inputs.
- **Fuzzy Autocorrection**: Use the `getEditDistance` edit distance algorithm to detect close typos for known subcommands (`init`, `create`, `release`, `list`) and recommend the correct commands.
- **Scaffold Isolation**: Never copy template `.git` metadata directories to new project target folders. Keep template directory cleanups inside `finally` blocks in `download.ts`.

---

## Testing Verification

Every newly added CLI command or argument validation logic must have a corresponding integration test in `test/register.test.ts` mock files.

- Mock all filesystem changes, commands action, and `process.exit` functions to maintain fast unit test cycles.
- Project test code formatting must be verified via `pnpm run lint` (`vp check`).
