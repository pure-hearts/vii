# Logging Guidelines in @vyron/utils

> Console print configurations for helpers.

---

## Logging Conventions

- **Silence by default**: Utilities should remain silent. Avoid injecting logs, console statements, or debug notices inside standard utility methods (like local cache writes) to prevent polluting the CLI output streams.
- **Verbose Error Logging**: When errors are recovered silently (like JSON parse crashes), optionally print debug trace logs under explicit test environments.
