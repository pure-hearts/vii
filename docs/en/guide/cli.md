# CLI Command Line Tool (@vyron/cli)

`@vyron/cli` exposes the global command `vii` (along with its alias `vi`) to bootstrap boilerplates, check connection mirrors, and publish releases. It acts as your project generator, automating setup processes for Vite, ESLint, TypeScript, and more.

---

## 🚀 Try It Online

> [!TIP]
> **Webcontainer Scaffolding Terminal Sandbox**:
> Experience the `vii` CLI directly in your browser with StackBlitz Webcontainer:
>
> 1. Click the button below to open the StackBlitz workspace.
> 2. Wait for dependencies installation, project build, and global command linking to complete automatically (a green success message will print in the console).
> 3. Run `vii init test-project` directly in the terminal to experience interactive scaffolding and concurrent mirror benchmarking!

<div class="playground-container" style="align-items: center; justify-content: center; padding: 2rem 0; margin-top: 1rem;">
  <a href="https://stackblitz.com/github/vfiee/project-boilerplate?file=packages/cli/README.md&startScript=stackblitz:cli" target="_blank" style="text-decoration: none; display: inline-flex; align-items: center; gap: 8px; background-color: var(--vp-c-brand-1); color: white; padding: 10px 24px; border-radius: 8px; font-weight: 600; font-size: 1.1rem; transition: background-color 0.2s;" onmouseover="this.style.backgroundColor='var(--vp-c-brand-2)'" onmouseout="this.style.backgroundColor='var(--vp-c-brand-1)'">
    ⚡ Try VII CLI on StackBlitz
  </a>
</div>

---

## 🛠️ Prerequisites

Before installing, please ensure that you have **Node.js** installed on your system (version `18.0.0` or higher is recommended).

You can check your Node.js version by running the following command in your terminal:

```bash
node -v
```

_If your version is lower than 18, please download the latest LTS release from the [Node.js Official Website](https://nodejs.org/)._

---

## 💻 Installation Guidelines

### Run Instantly without Installation (Recommended ✨)

If you prefer not to pollute your global packages, you can execute the CLI dynamically using `npx`:

```bash
npx @vyron/cli init my-project
```

_Note: `npx` will download the latest version of `@vyron/cli` on the fly, run it to create `my-project`, and clean it up afterward._

### Global Permanent Installation

Install it globally if you intend to use the `vii` scaffold frequently.

```bash
pnpm add -g @vyron/cli  # Install via pnpm
# OR
npm install -g @vyron/cli  # Install via npm
```

> [!WARNING]
> **Troubleshooting Global Permission Error (macOS / Linux `EACCES`)**:
> If the global installation fails with `Permission denied` errors, run the command prefixed with `sudo` (root authorization will be requested):
>
> ```bash
> sudo npm install -g @vyron/cli
> ```

---

## 🔄 Interactive Project Initialization Steps

Run `vii init` to enter the interactive creation steps guided by prompt dialogs.

1. **Step 1: Choose Your Project Name**
   The console will ask: `? Project name: `.
   _Note: Names can only contain letters, numbers, and hyphens (`-`). Spaces and special characters are forbidden._
2. **Step 2: Select a Boilerplate Template**
   The console will ask: `? Select a template: `. Use arrow keys `↑` `↓` and hit enter:
   - `vue-pc`: Vue 3 Web Application template (powered by Vite).
   - `vue-mobile`: Mobile H5 Web Application template (powered by Vite).
   - `nest-ts`: NestJS server-side framework template.
   - `uniapp-ts`: uni-app template for WeChat Mini-programs and native cross-platform Apps.
3. **Step 3: Select an Acceleration Mirror**
   The console will ask: `? Select a mirror source: `.
   The tool automatically fires concurrent non-proxy latency checks to regional mirrors. The fastest node will be highlighted with a **`[推荐]`** (Recommended) tag. Press Enter to pull templates at maximum speed!
4. **Step 4: Bootstrapping and Dev Run**
   Once the cloning finishes successfully, run the following to begin coding:
   ```bash
   cd my-project     # Enter the workspace directory
   pnpm install      # Install package dependencies
   pnpm dev          # Start the dev server
   ```

---

## ⌨️ Command & Option References

Besides the interactive setup wizard, you can pass parameters explicitly to skip interactive prompts.

### `vii init [DIRECTORY] [OPTIONS]`

Bootstraps new projects.

- **Positional Arguments**:
  - `DIRECTORY`: Target project folder name.
- **Available Options**:
  - `-t, --template <name>`: Define target preset templates (`vue-pc`, `vue-mobile`, `nest-ts`, `uniapp-ts`) or public repositories (`github:user/repo#branch`).
  - `-m, --mirror <url>`: Force scaffold via a specific GitHub mirror link, skipping benchmarks.
  - `-f, --force`: Clear existing files if the folder is not empty.

**Examples**:

```bash
# Clone the vue-pc boilerplate using KKGitHub acceleration source
vii init my-app -t vue-pc -m https://kkgithub.com

# Scaffold from a custom GitHub repository and branch
vii init my-app -t github:my-username/my-template#release

# Force rebuild in an existing non-empty directory (this empties target folder!)
vii init my-app --force
```

---

## 🌐 Mirror Source Config Manager

Enables managing custom GitHub mirrors. Configurations automatically persist inside `~/.viirc` and will be loaded dynamically by the initialization prompts.

### `vii mirror [SUBCOMMAND]`

Manages custom GitHub connection endpoints.

- **Subcommands**:
  - `vii mirror list` (or without subcommand): Print current system-defined and user-customized mirrors.
  - `vii mirror speed` (or shortcuts `vii speed` / `vii test-mirror`): Trigger concurrent latency checking.
  - `vii mirror add <name> <url>`: Validate and append custom mirrors.
  - `vii mirror delete <name>`: Safely drop customized endpoints (built-in sources are read-only and cannot be deleted).

**Examples**:

```bash
# Benchmark all mirror sites and print latency reports
vii speed

# Add a customized GitHub mirror URL
vii mirror add my-mirror https://github.com.cnps.org

# Remove a custom mirror
vii mirror delete my-mirror
```

---

## 🛡️ Smart Failsafe & Typo Correction

Avoid shell failures from fast typos. `vii` implements robust input parsing and suggestion mechanisms:

- **Unknown Option Protection**: Running `vii init my-app --tempalte vue` will throw:
  `❌ 不支持的选项: --tempalte。您是不是想输入 "--template"?`
- **Command Typo Suggestion**: If you type incorrect commands like `vii initd`, the tool resolves the closest option using the Levenshtein distance algorithm:
  `❌ 不支持的命令: initd。您是不是想输入 "init"?`
- **Redundant Args Interception**: Commands like `vii init my-app extra-arg` will be blocked to prevent unexpected argument overrides.
