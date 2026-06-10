# Quality Guidelines in @vyron/release

> Quality standards and release safeguards.

---

## Release Safeguards

- **Dirty Working Directory Block**: Before bumping versions, the release pipeline must verify the current Git working tree is clean. Do not commit release version bumps over uncommitted user files.
- **Rollback Consistency**: If a step fails, warn the developer about the current partial state (e.g. untagged commit).
- **TS Compatibility**: Maintain dual ES Module and CommonJS builds for downstream tools. Verify configurations inside `vite.config.ts`.
