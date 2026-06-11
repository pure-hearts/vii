# Quick Start

This guide gets you up and running with the components of the VII Toolchain.

---

## 1. Scaffold CLI Installation

Install the `@vyron/cli` globally to bootstrap boilerplate projects:

```bash
# via pnpm
pnpm add -g @vyron/cli

# via npm
npm install -g @vyron/cli
```

Or run directly without installation using `npx`:

```bash
npx @vyron/cli init my-project
```

---

## 2. Introduce Storage Manager

Add the storage module to secure and schedule expirations for local browser cache data:

```bash
pnpm add @vyron/storage
```

Instantiate and save values in your code:

```typescript
import { createStorage } from "@vyron/storage";

// 1. Create a namespace-isolated Web Storage wrapper with 1-day TTL
const store = createStorage("local", {
  prefix: "user_",
  expire: 24 * 3600 * 1000, // 1 day in ms
});

// 2. Set and Get nested data
store.set("profile", { name: "vyron", role: "admin" });
const name = store.get("profile", "name"); // 'vyron'

// 3. Listen to state changes
store.onChange("profile", (newVal) => {
  console.log("User profile changed:", newVal);
});
```

---

## 3. Set Up Auto-Release Pipeline

Configure interactive upgrades and npm packaging locally:

```bash
pnpm add @vyron/release -D
```

Map scripts in your `package.json`:

```json
{
  "scripts": {
    "release": "vii release"
  }
}
```

Or orchestrate releases programmatically via Node.js scripts:

```typescript
import { release } from "@vyron/release";

async function runPublish() {
  await release({
    commitMessage: "chore: release {version}",
    skipPublish: false, // trigger npm publish
  });
}

runPublish();
```

---

## Next Up

Read the package-specific manuals to discover high-level capabilities:

- [CLI Tool](./cli)
- [Release Pipeline](./release)
- [Storage Manager](./storage)
