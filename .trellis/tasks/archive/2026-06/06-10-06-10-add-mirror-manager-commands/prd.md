# Support custom GitHub mirror management via vii mirror command

## Goal

Introduce persistent configuration (`~/.viirc`) and a standalone `vii mirror` manager command suite (supporting default/list, speed, add, and delete actions) for users to custom-manage GitHub cloning acceleration sources.

## Requirements

1. **Configuration Persistence**:
   - Save custom mirrors locally to `~/.viirc` in JSON format.
   - Retain standard built-in mirrors (GitHub, KKGitHub, GitClone) as immutable items.
2. **Mirror Command Suite**:
   - `vii mirror` / `list` / `ls`: prints all mirrors with labels `[内置]` or `[自定义]`.
   - `vii mirror speed`: runs direct parallel latency speedtests for all mirrors and recommends the fastest mirror.
   - `vii mirror add <name> <url>`: validates URL format, appends custom mirror, and persists. Rejects overriding built-in names.
   - `vii mirror delete <name>`: deletes mirror from custom list. Rejects deleting built-in mirrors.
3. **Integration**:
   - Integrate choices from `getAllMirrors()` into the interactive prompts for project creation (`promptMirror()`).
   - Expose the commands in `--help` and update package `README.md`.
4. **Unit Tests**:
   - Test config reading/writing and list merges (`config.test.ts`).
   - Test command actions and printouts (`mirror-command.test.ts`).

## Acceptance Criteria

- [ ] Command `vii mirror` defaults to listing available mirrors.
- [ ] Command `vii mirror speed` runs and reports latency speedtest correctly.
- [ ] Command `vii mirror add` persists and registers a custom mirror.
- [ ] Command `vii mirror delete` fails on built-in items and successfully cleans custom ones.
- [ ] Built-in templates prompts pull all mirrors (built-in + custom) dynamically.
- [ ] Lints and unit tests (55+) all pass successfully.
