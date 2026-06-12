# Release Pipeline (@vyron/release)

`@vyron/release` orchestrates version increments, changelog writes, Git Tag creation, and npm repository publication.

---

## 🚀 Try It Online

> [!TIP]
> **Scaffolding Terminal Sandbox**:
> Try the CLI publish logic using `--dry-run` to test release behaviors safely:
>
> 1. Click the button below to open the StackBlitz workspace.
> 2. Wait for dependencies installation, project build, and global command linking to complete automatically.
> 3. Run `vii release --dry-run` directly in the terminal to simulate a release safely. You can also try other parameters such as `--minor --dry-run`.

<div class="playground-container" style="align-items: center; justify-content: center; padding: 2rem 0; margin-top: 1rem;">
  <a href="https://stackblitz.com/github/vfiee/project-boilerplate?file=packages/release/README.md&startScript=stackblitz:release" target="_blank" style="text-decoration: none; display: inline-flex; align-items: center; gap: 8px; background-color: var(--vp-c-brand-1); color: white; padding: 10px 24px; border-radius: 8px; font-weight: 600; font-size: 1.1rem; transition: background-color 0.2s;" onmouseover="this.style.backgroundColor='var(--vp-c-brand-2)'" onmouseout="this.style.backgroundColor='var(--vp-c-brand-1)'">
    ⚡ Try VII Release on StackBlitz
  </a>
</div>

---

## 💡 Core Pillars

- **Registry Conflicts Protection**: release performs target checks on the npm registry. It rejects execution immediately if the version already exists.
- **Atomic Physical Rollback**: If network disconnects or permission errors trigger a failure during git tags or npm publish, version edits are reverted to maintain a clean git working tree.
- **Dry Run**: Preview the publish task tree and commands without modifying package files.

---

## 🛠️ CLI Options

```bash
# Interactive publishing wizard
vii release

# Specify version increments (patch/minor/major/custom)
vii release --minor
vii release --custom 2.0.0

# Pre-release suffix
vii release --minor --pre-release rc

# Skips
vii release --skip-publish        # Bump versions and tag locally only
vii release --skip-confirm        # Skip confirmation dialog
vii release --skip-github-release # Skip creating GitHub release notes
```

---

## 💻 Programmatic API

Inject release scripts into custom scripts:

```typescript
import { release } from "@vyron/release";

await release({
  cwd: process.cwd(),
  dryRun: false,
  minor: true,
  commitMessage: "chore: bump to {version}",
  config: {
    parallel: false, // parallel builds for monorepos
    changelog: { output: "CHANGELOG.md" },
  },
});
```
