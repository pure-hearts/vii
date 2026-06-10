# Local npm pack validation for CLI dual builds

## Goal

Validate the `@vyron/cli` package post-build using `npm pack` in a clean environment to ensure:

- The package bundles correct files (`index.js`, `dist`, etc.).
- There are no package execution, dual ESM/CJS path resolution, or `require` parsing errors.
- The command line utility `vii` runs correctly when installed locally.

## Requirements

1. **Build and Pack**:
   - Run `pnpm run build` in `packages/cli` to generate compile output.
   - Run `pnpm pack` (or `npm pack`) inside `packages/cli` to produce a `.tgz` archive.
2. **Clean Installation**:
   - Create a temporary directory outside of the monorepo.
   - Initialize a dummy npm project and install the compiled `.tgz` package.
3. **Execution Verification**:
   - Verify that running the local executable `npx vii` (or invoking `index.js` directly) works as expected.
   - Run `vii --help` and `vii list` commands and check for correct outputs without errors or quiet exceptions.

## Acceptance Criteria

- [ ] Successfully generate the `@vyron/cli` `.tgz` bundle.
- [ ] Install the local `.tgz` bundle in a clean workspace folder.
- [ ] Run `npx vii --help` and verify it prints the CLI instructions properly.
- [ ] Run `npx vii list` and ensure it runs the registered command logic without module import or path resolution errors.
- [ ] Clean up the temporary workspace folder.
