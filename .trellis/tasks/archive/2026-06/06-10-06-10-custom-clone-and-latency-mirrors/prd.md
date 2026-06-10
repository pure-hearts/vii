# Support custom GitHub clone sources and mirror latency testing

## Goal

Extend the CLI with support for direct GitHub cloning and parallel latency testing for candidate mirrors (KKGitHub, GitClone, etc.) in a non-proxy manner to find the fastest download route. Add a Mermaid workflow flowchart to the CLI's README.

## Requirements

1. **Custom Clone Source**:
   - Provide an option to input a custom GitHub address (`user/repo#branch` or full git link) in the interactive templates list.
2. **GitHub Mirrors with Latency Tests**:
   - Offer a list of candidate mirrors (GitHub, KKGitHub, GitClone).
   - Before prompt rendering, perform a parallel, direct latency test (`fetch` without proxy) and display dynamic latency (e.g. `98ms`, `Timeout`) with a `[推荐]` tag on the fastest mirror.
   - Command-line option `-m`/`--mirror <url>` bypasses prompts and applies mirror directly.
3. **Mermaid Flowchart in README**:
   - Update `packages/cli/README.md` to add a clear Mermaid diagram displaying the CLI's execution flow (argument validation -> interactive options -> mirror testing -> git clone -> git clean-up -> success).
4. **Unit Tests**:
   - Implement Vitest tests for mirror selection and URL transformation.

## Acceptance Criteria

- [ ] Interactive choices list a custom clone input option.
- [ ] Direct latency tests measure and append correct latency statistics.
- [ ] Selected mirror successfully replaces URL domains during git clone execution.
- [ ] Mermaid flowchart is added to the CLI README.
- [ ] Run full test suite (`pnpm --filter @vyron/cli test`) successfully.
