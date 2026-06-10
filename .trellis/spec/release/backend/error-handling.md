# Error Handling in @vyron/release

> Standards for raising, propagating, and handling git/npm release script errors.

---

## Error Handling Patterns

### Subprocess Failures

When running Git or NPM commands (like `git status`, `git commit`, or `npm publish`):

- Any non-zero exit code or stderr write from git/npm subprocesses must throw a descriptive error.
- Throwing immediately stops the release loop to prevent partial releases (e.g. committing changes but failing to push, or bumping versions without publishing).

```typescript
// Example from git.ts / npm.ts
if (status !== 0) {
  throw new Error(`Git command failed with exit code ${status}: ${stderr}`);
}
```

---

## Common Mistakes

- **Do not ignore git push/publish failures**: Never swallow git/npm subprocess errors. A failed step must fail the entire release run.
