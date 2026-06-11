# What is VII?

**VII Toolchain** is an integrated toolkit dedicated to boosting frontend engineering efficiency and runtime storage reliability. With the design goals of being **ultra-lightweight, failsafe, and progressive**, VII resolves daily developer friction points such as tedious project setups, manual release gates, and fragmented storage drivers.

---

## Core Philosophy

### 1. Progressive & Lightweight

We strive to keep dependencies minimal. Non-essential engines are decoupled as **Subpath Exports** for plugins. In `@vyron/storage`, for example, drivers like Cookie and IndexedDB are excluded from the main bundle and only loaded when explicitly imported, leading to a minimal core bundle size of about 35kB.

### 2. Failsafe & Defensive Design

Developer tools should catch human mistakes early and act as a reliable safety net:

- **CLI**: Uses Levenshtein distance to suggest correct commands upon typos (e.g., typing `releas` will prompt `Did you mean "release"?`);
- **Release**: Automatically reverts `package.json` versions and local Git Tags upon network or publish errors to avoid dirty "half-released" states;
- **Storage**: Rollbacks batch operations on sync quota overflows and blocks dangerous synchronous operations on purely asynchronous engines like IndexedDB.

---

## Package Ecosystem

<div class="architecture-container">
  <div class="arch-root-card">👑 VII Toolchain</div>
  <div class="architecture-grid">
    <div class="arch-card">
      <div class="arch-title">🛠️ @vyron/cli</div>
      <ul class="arch-list">
        <li>One-click project bootstrapping</li>
        <li>Non-proxy concurrent mirror speed test</li>
        <li>Spell correction fuzzy matching</li>
      </ul>
    </div>
    <div class="arch-card">
      <div class="arch-title">📦 @vyron/release</div>
      <ul class="arch-list">
        <li>Interactive multi-package publishing</li>
        <li>Automatic CHANGELOG & Release Notes</li>
        <li>Transaction rollback on publishing failures</li>
      </ul>
    </div>
    <div class="arch-card">
      <div class="arch-title">💾 @vyron/storage</div>
      <ul class="arch-list">
        <li>Prefix isolation and secure clear</li>
        <li>High-accuracy TTL & auto GC</li>
        <li>Anti-tamper salted signatures</li>
        <li>Cross-tab BroadcastChannel sync</li>
      </ul>
    </div>
  </div>
</div>

## Next Steps

Read the [Quick Start](./quick-start) to see how to integrate VII into your local workflow.
