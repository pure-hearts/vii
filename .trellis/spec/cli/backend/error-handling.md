# Error Handling in @vyron/cli

> Standards for raising, propagating, and logging errors within the CLI.

---

## Overview

The CLI must exit gracefully and display clear, colorized error messages when operations fail, inputs are invalid, or unsupported commands are used. Unhandled promise rejections are forbidden.

---

## Error Handling Patterns

### 1. Graceful Command Terminations

All command actions must handle exceptions using `try-catch` blocks and use `logger.error` to output error context, then exit the process with status code `1`.

```typescript
try {
  await command.action(options);
} catch (error) {
  logger.error(`命令执行失败: ${error}`);
  process.exit(1);
}
```

### 2. Parameter and Command Validation

When parsing CLI arguments:

- Throw a status-1 exit for unknown options (e.g., starts with `-` but is unrecognized).
- Throw a status-1 exit for spelling mistakes of known subcommands (within edit distance of 1).
- Throw a status-1 exit when multiple positional arguments are passed for single-directory routing.

---

## Common Mistakes

- **Do not let `process.exit(0)` run on errors**: All validations and lifecycle failures must return `process.exit(1)`.
- **Do not throw bare Errors to the user**: Always catch internal Node fs/git errors and wrap them in user-friendly tips before printing.
