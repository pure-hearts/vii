# Quality Guidelines in @vyron/utils

> General code style, typing, and safety.

---

## Code Quality Standards

- **Strict Type Safety**: All methods must expose explicit argument and return types. Avoid `any` types for internal helper parameters.
- **Atomic File Writes**: Write files atomically where possible to avoid half-written databases when processes are interrupted.
- **Reusability**: Shared constants and data schemas should be unified within this utility package.
