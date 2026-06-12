# CLI Command Line Tool (@vyron/cli)

`@vyron/cli` exposes the global command `vii` (along with its alias `vi`) to bootstrap boilerplates, check connection mirrors, and publish releases.

---

## 🚀 Try It Online

> [!TIP]
> **Webcontainer Scaffolding Terminal Sandbox**:
> Experience the `vii` CLI directly in your browser with StackBlitz Webcontainer:
>
> 1. Click the button below to open the StackBlitz workspace.
> 2. Wait for dependencies installation, project build, and global command linking to complete automatically.
> 3. Run `vii init test-project` directly in the terminal to experience interactive scaffolding and concurrent mirror benchmarking!

<div class="playground-container" style="align-items: center; justify-content: center; padding: 2rem 0; margin-top: 1rem;">
  <a href="https://stackblitz.com/github/vfiee/project-boilerplate?file=packages/cli/README.md&startScript=stackblitz:cli" target="_blank" style="text-decoration: none; display: inline-flex; align-items: center; gap: 8px; background-color: var(--vp-c-brand-1); color: white; padding: 10px 24px; border-radius: 8px; font-weight: 600; font-size: 1.1rem; transition: background-color 0.2s;" onmouseover="this.style.backgroundColor='var(--vp-c-brand-2)'" onmouseout="this.style.backgroundColor='var(--vp-c-brand-1)'">
    ⚡ Try VII CLI on StackBlitz
  </a>
</div>

---

## 💡 Key Design Areas

### 1. Scaffolding Mirror Speed Benchmarking

Scaffolding presetted code from GitHub can be slow due to network hops. `vii` implements:

- Concurrent non-proxy latency checks sending `HEAD` queries to regional GitHub mirrors (such as KKGitHub, GitClone).
- Fast and slow mirrors are visually color-graded, auto-highlighting recommendations.

### 2. Typo Corrections (Levenshtein Distance)

Prevent failed executions from fast typing. `vii` calculates command boundaries using editing distance:

```bash
$ vii initd
❌ Unknown command: initd. Did you mean "init"?
```

---

## ⌨️ Command References

### `vii init [DIRECTORY]`

Bootstraps presets. Interactive steps fire if parameters are missing.

- `-t, --template <name>`: Define target preset templates (`vue-pc`, `vue-mobile`, `nest-ts`, `uniapp-ts`) or public repositories (`github:user/repo#branch`).
- `-m, --mirror <url>`: Force scaffold via a specific GitHub mirror link.
- `-f, --force`: Clear existing files if the folder is not empty.

### `vii mirror [SUBCOMMAND]`

Configures customized mirror lists. Data persists inside `~/.viirc`.

- `vii mirror list`: Print preset and custom mirror targets.
- `vii mirror add <name> <url>`: Validate and append custom mirrors.
- `vii mirror delete <name>`: Safely drop customized endpoints.
- `vii mirror speed`: Perform concurrent latency checking.
