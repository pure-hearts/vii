# Release Pipeline (@vyron/release)

`@vyron/release` is like an **"automatic package delivery clerk"** that securely labels your project and ships it to the web. It bumps versions intelligently like `bumpp`, and more importantly, it provides a unique **transactional rollback protection (automatic regret pill)**, avoiding any dirty workspace states.

---

## 🚀 Try It Online

> [!TIP]
> **Scaffolding Terminal Sandbox**:
> Try the CLI publish logic using `--dry-run` to test release behaviors safely:
>
> 1. Click the button below to open the StackBlitz workspace.
> 2. Wait for dependencies installation, project build, and global command linking to complete automatically (a green success message will print in the console).
> 3. Run `vii release --dry-run` directly in the terminal to simulate a release safely. You can also try other parameters such as `--minor --dry-run`.

<div class="playground-container" style="align-items: center; justify-content: center; padding: 2rem 0; margin-top: 1rem;">
  <a href="https://stackblitz.com/github/vfiee/project-boilerplate?file=packages/release/README.md&startScript=stackblitz:release" target="_blank" style="text-decoration: none; display: inline-flex; align-items: center; gap: 8px; background-color: var(--vp-c-brand-1); color: white; padding: 10px 24px; border-radius: 8px; font-weight: 600; font-size: 1.1rem; transition: background-color 0.2s;" onmouseover="this.style.backgroundColor='var(--vp-c-brand-2)'" onmouseout="this.style.backgroundColor='var(--vp-c-brand-1)'">
    ⚡ Try VII Release on StackBlitz
  </a>
</div>

---

## 💡 Core Features

For beginners, publishing package releases (bumping versions, creating tags, pushing commits, and publishing on npm) can be nerve-wracking. A single mistake might result in a broken git tree or incorrect npm package versions. `@vyron/release` acts as your personal automated butler:

### 1. Three Precondition Checks (Pre-check)

Before mutating any files or tags, the tool runs non-intrusive local validations. If any check fails, execution terminates immediately without changing any files:

- **Is Git Initialized?**: Verifies if the target directory is a git workspace.
- **Any Unsaved Drafts?**: Blocks execution if there are uncommitted changes, preventing unfinished changes from being published.
- **Logged into NPM?**: Runs a silent `npm whoami` to ensure you are logged into your npm account in the current terminal environment, preventing publication failure at the very last step.

### 2. Atomic Physical Rollback (Automatic regret pill)

This is the key safety mechanism. If any error (such as network timeout, registry failure, or permission issues) occurs during the bump, commit, tag, push, or publish phases, the tool will **automatically trigger a time-rollback**:

1. Reverts `package.json` to its original version.
2. Automatically deletes the newly created local git commit and tag.
3. Restores your repository to its clean original state.

### 3. Dry Run Simulation Mode

Unsure about what changes the script will perform? Append the `--dry-run` flag. The tool will print the release operation tree in your console, showing planned version increments and command executions **as a simulation run without performing any actual file writes**.

---

## ⌨️ CLI Command Guide

In a workspace where `@vyron/cli` is globally linked or `@vyron/release` is locally installed, you can trigger release tasks using `vii release`.

### 1. Interactive Publishing Wizard

Run the command in your project directory:

```bash
vii release
```

The console will guide you through the process:

1. **`? Select version`**: Choose the target semantic version bump:
   - `patch` (e.g. `1.0.0` -> `1.0.1`, for bug fixes)
   - `minor` (e.g. `1.0.0` -> `1.1.0`, for new features)
   - `major` (e.g. `1.0.0` -> `2.0.0`, for breaking changes)
   - `custom` (Manually define version digits, e.g. `1.2.5-beta.0`)
2. **`? Confirm release`**: Double check if you are ready to publish. Confirming will write updates, commit changes, and publish the package automatically.

### 2. Command Options Reference

Skip interactive menus by configuring options explicitly:

- `--releaseAs <version_or_level>`: Specify target version increment levels or specific numbers.
- `--dryRun`: Run in read-only simulation mode.
- `--skip-push`: Bump files and create tags locally, but skip `git push`.
- `--skip-publish`: Perform git operations, but skip pushing package tarballs to npm registry.
- `--pre-release <identifier>`: Append pre-release tags (e.g. using `rc` with `minor` generates versions like `1.1.0-rc.0`).

**Common Combinations**:

```bash
# Simulate a patch release to inspect outcomes
vii release --releaseAs patch --dryRun

# Perform local version bump and tagging without remote changes
vii release --releaseAs minor --skip-push --skip-publish
```

---

## 💻 Programmatic API

You can also import and orchestrate release pipelines in your customized build/release scripts:

```typescript
import { release } from "@vyron/release";

await release({
  cwd: process.cwd(), // Running context directory
  dryRun: false, // Enable/disable dry run simulation
  minor: true, // Bump minor version
  commitMessage: "chore(release): v{version}", // Custom Git commit message
  config: {
    parallel: false, // Monorepo parallel publish toggle
    changelog: {
      output: "CHANGELOG.md", // Path to write changelogs, set false to disable
    },
  },
});
```

### `ReleaseOptions` Parameter Specs:

| Option          | Type      | Default                        | Description                                    |
| :-------------- | :-------- | :----------------------------- | :--------------------------------------------- |
| `cwd`           | `string`  | `process.cwd()`                | Directory where the release command executes   |
| `dryRun`        | `boolean` | `false`                        | Enable/disable read-only simulation mode       |
| `releaseAs`     | `string`  | `undefined`                    | Version level or specific semantic version     |
| `skipPush`      | `boolean` | `false`                        | Skip pushing local commits and tags to remote  |
| `skipPublish`   | `boolean` | `false`                        | Skip npm registry publishing step              |
| `commitMessage` | `string`  | `"chore(release): v{version}"` | Template format for git release commit message |
