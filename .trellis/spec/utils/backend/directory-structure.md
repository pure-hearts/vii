# Directory Structure in @vyron/utils

> Module organization and file layout for the utils package.

---

## File Layout

The utils package contains shared libraries and helpers:

```
packages/utils/
├── src/
│   ├── storage.ts    # JSON-based local key-value store database helper
│   └── index.ts      # Entry exporter
├── test/
├── package.json
└── tsconfig.json
```

---

## Coding Rules

- **Minimalist Exporters**: All helper modules (like `storage.ts`) must be re-exported inside `src/index.ts` to allow absolute package level imports from downstream libraries.
