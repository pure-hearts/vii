# Error Handling in @vyron/utils

> Fault tolerance and recovery strategies inside utilities.

---

## Error Handling Patterns

### JSON Parsing and File Read Resilience

When reading or writing files from disk (e.g. storage databases):

- Wrap `fs.readFileSync` and `JSON.parse` operations in `try-catch` blocks.
- If a file is missing, empty, or contains corrupt JSON data, catch the error and fallback to an empty default state (`{}`) rather than throwing to the consumer. This ensures resilient cache reads.

```typescript
// Example from storage.ts
try {
  if (!fs.existsSync(this.dbPath)) return {};
  const content = fs.readFileSync(this.dbPath, "utf-8");
  return JSON.parse(content);
} catch {
  return {};
}
```
