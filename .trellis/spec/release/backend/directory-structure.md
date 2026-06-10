# Directory Structure in @vyron/release

> Module organization and file layout for the release package.

---

## File Layout

The release package splits individual bump, commit, push, and publish pipelines into steps:

```
packages/release/
├── src/
│   ├── steps/        # bump-version, check-git, commit, publish, push scripts
│   ├── git.ts        # Git commands subprocess wrapper
│   ├── npm.ts        # NPM publish subprocess wrapper
│   ├── index.ts      # Runner coordinator
│   └── types.ts      # Options and config typings
├── test/
├── package.json
└── tsconfig.json
```

---

## Coding Rules

- **Modular Steps**: Each release step must live inside `src/steps/` and export a default function executing that specific lifecycle step.
- **Git and NPM shell integration**: Avoid spawning random processes directly; use the helper functions defined inside `git.ts` and `npm.ts` to ensure consistent execution environment and error capturing.
