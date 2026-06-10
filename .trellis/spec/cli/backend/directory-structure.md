# Directory Structure in @vyron/cli

> Module organization and file layout.

---

## File Layout

The CLI package follows a decoupled directory structure split by commands, user interaction, and filesystem tasks:

```
packages/cli/
├── src/
│   ├── commands/     # Subcommand definitions and action handlers (init, list, release)
│   ├── prompts/      # Interactive command line questions and collections
│   ├── scaffold/     # Scaffolding core logics (fs utilities, git downloaders)
│   ├── utils/        # Logger, register and core route dispatcher
│   └── index.ts      # Entry point
├── test/             # Vitest unit and integration tests
├── package.json
└── tsconfig.json
```

---

## Coding Rules by Directory

### `src/commands/`

Each file represents a subcommand mapping to the CLI routers. Subcommands should implement a standard action structure:

```typescript
export const myCommand = {
  name: "mycommand",
  description: "Description...",
  async action(options: Options): Promise<void> {
    // handler...
  },
};
```

### `src/scaffold/`

Contains file operations and git clone logic.

- Must exclude `.git` from being copied to the project directory during the template cloning phase in `fs/copy.ts`.
- Validations (NPM package names, folder existence check) should be encapsulated inside `validators.ts`.

### `test/`

All unit tests should be stored in the root `test/` folder of the package, named `<module>.test.ts`, rather than colocated under `src/` to separate tests from production assets.
