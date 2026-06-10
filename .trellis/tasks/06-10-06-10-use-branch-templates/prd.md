# Support template branch cloning from project-boilerplate

## Goal

Refactor the CLI template download and definitions logic to clone different templates as different branches from a single unified repository (`https://github.com/vfiee/project-boilerplate.git`).

## Requirements

1. **Template Definitions Update**:
   - Update `BUILTIN_TEMPLATES` in `packages/cli/src/prompts/template.ts`.
   - Update values to format `github:vfiee/project-boilerplate#<branch_name>` (e.g., `#vue-pc`, `#vue-mobile`, `#nest-ts`, `#uniapp-ts`).
2. **Download Implementation Refactoring**:
   - Modify `downloadTemplate` in `packages/cli/src/scaffold/download.ts` to parse the branch delimiter `#`.
   - If `#` is present, extract the branch name and construct `git clone --depth 1 -b <branch_name> <gitUrl> <tmpPath>`.
   - Keep default behavior without `-b` flag if no branch is specified (maintaining backward compatibility).
3. **Unit Tests**:
   - Add a unit test file `packages/cli/test/download.test.ts` using Vitest.
   - Mock `node:child_process` `execSync` to assert that correct git commands are generated and executed for templates with/without branches, and error cases propagate errors correctly.

## Acceptance Criteria

- [ ] `BUILTIN_TEMPLATES` contains values mapping to the unified repo with branch suffix (e.g. `github:vfiee/project-boilerplate#vue-pc`).
- [ ] `downloadTemplate` successfully parses repository url and git branch suffix.
- [ ] Running template downloads with branch invokes `git clone --depth 1 -b <branch> ...`.
- [ ] `packages/cli/test/download.test.ts` is created and passes all tests (including branch, non-branch, and command failure paths).
- [ ] Runs quality lint via `pnpm run lint` and passes successfully.
