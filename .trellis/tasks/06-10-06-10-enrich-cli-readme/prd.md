# Enrich CLI README documentation with features and usage guides

## Goal

Enhance the `@vyron/cli` package README.md with comprehensive descriptions of features, installation steps, terminal commands, error handling/validation features, and clear flowchart mappings.

## Requirements

1. **Detailed README**:
   - Introduce the CLI tool's capabilities.
   - List key features (auto speedtest, spelling auto-suggestion, custom git repo source, monorepo template branches, automatic `.git` history strip).
   - Document commands (`init`, `list`, `release`) and options (`-t`, `-m`, `-r`, `--force`, `--dry-run`, etc.) with example usage.
2. **Mermaid Flowchart**:
   - Ensure the Mermaid process chart is intact and clearly represents CLI decision flows.

## Acceptance Criteria

- [ ] `packages/cli/README.md` is updated with professional sections (Introduction, Features, Installation, Workflow, Commands, Validation).
- [ ] Document options for both interactive and non-interactive usage.
- [ ] Ensure formatting passes `pnpm run lint` successfully.
