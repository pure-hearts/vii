# Logging Guidelines in @vyron/release

> Log levels and step tracking output conventions for release executions.

---

## Log Output Conventions

- **Lifecycle Stage Indicators**: Always log the start and success of each distinct release phase (e.g., `Bumping version...`, `Committed changes...`) so developers know which part of the git/npm release cycle is currently running.
- **Subprocess Stdout Forwarding**: Forward subprocess output to the user console for debugging when `dryRun` options or verbose configurations are enabled.
- **Structured Error logs**: Error contexts must include both the release step context and raw subprocess messages.
