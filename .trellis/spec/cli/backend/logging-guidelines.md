# Logging Guidelines in @vyron/cli

> Guidelines for writing user logs and terminal outputs in the CLI.

---

## Logging Conventions

To maintain a clean and beautiful CLI user interface, all output must use the structured `logger` utility wrapper instead of raw console calls (except for printing static help instructions).

---

## Log Levels & ANSI Colors

Every log level corresponds to a standard ANSI terminal color code:

- **Success (`logger.success`)**: Colored in green (`\x1b[32m`), prefixed with `✅`. Used for completed operations like successfully generating a project scaffolding.
- **Error (`logger.error`)**: Colored in red (`\x1b[31m`), prefixed with `❌`. Used for terminations, validation errors, and subprocess crashes.
- **Warning (`logger.warn`)**: Colored in yellow (`\x1b[33m`), prefixed with `⚠️`. Used for non-fatal cancelations and warnings.
- **Info (`logger.info`)**: Colored in cyan (`\x1b[36m`), prefixed with `ℹ️`. Used for normal runtime steps and messages.

```typescript
export const logger = {
  info(message: string): void {
    console.log(`\x1b[36mℹ️  ${message}\x1b[0m`);
  },
  success(message: string): void {
    console.log(`\x1b[32m✅ ${message}\x1b[0m`);
  },
  error(message: string): void {
    console.error(`\x1b[31m❌ ${message}\x1b[0m`);
  },
  warn(message: string): void {
    console.warn(`\x1b[33m⚠️  ${message}\x1b[0m`);
  },
};
```

---

## Common Mistakes

- **Do not hardcode ANSI colors outside `logger.ts`**: Keep all colors encapsulated in the logger wrapper to allow centralized theme overrides or CI non-interactive styling.
- **Do not leak raw `console.log` for status tracing**: Ensure all status logs use structured `logger` levels.
