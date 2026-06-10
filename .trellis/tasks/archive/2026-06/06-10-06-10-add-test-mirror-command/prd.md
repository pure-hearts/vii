# Add standalone test-mirror command for github latency test

## Goal

Add a standalone command `test-mirror` (with alias `speed`) to the CLI to test and print response latencies for built-in GitHub mirrors in real-time.

## Requirements

1. **Standalone Command**:
   - Register a new CLI command `test-mirror` (alias `speed`) that tests GitHub mirror latencies directly.
   - Reuse latency testing logic from interactive prompts.
   - Display a beautifully formatted terminal output with latency statistics (success checkmark, fail cross, latency ms) and recommend the fastest mirror along with the initialization command.
2. **Help and Suggestions Integration**:
   - Expose the command in `--help` output.
   - Integrate `test-mirror` and `speed` into the edit distance spelling correction list.
3. **Unit Tests**:
   - Write Vitest tests verifying the test-mirror action prints the output containing the tested mirrors.
4. **Documentation**:
   - Update package README.md to describe the `test-mirror` (alias `speed`) command usage.

## Acceptance Criteria

- [ ] Execute `vii test-mirror` or `vii speed` correctly runs a non-proxy latency speedtest and prints formatted results.
- [ ] Unknown misspelled commands correct to `test-mirror` or `speed` when applicable.
- [ ] Command is fully documented in packages/cli/README.md.
- [ ] All 51+ unit tests pass.
- [ ] Run quality lint successfully.
