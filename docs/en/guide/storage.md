# Storage Manager (@vyron/storage)

`@vyron/storage` is not just a simple wrapper around browser's native `localStorage`. It acts as an **"intelligent secure vault for storing local data"**, supporting multi-driver extension (Memory, LocalStorage, SessionStorage, Cookie, IndexedDB), expired time caching control (TTL), anti-tampering signature verification, concurrent transaction recovery, and reactive cross-tab data synchronization subscriptions.

---

## 💻 Driver Compatibility Matrix

To keep the bundle size minimal (~35kB core size), the package excludes Cookie and IndexedDB engines from the main entry, using a **Subpath Imports** mechanism.

| API Type                 | Included Methods                                                    | Sync Drivers (Memory / Web / Cookie) | Async Drivers (IndexedDB) | Custom Drivers (No keys method) |
| :----------------------- | :------------------------------------------------------------------ | :----------------------------------: | :-----------------------: | :-----------------------------: |
| **Sync Single CRUD**     | `get`, `set`, `has`, `remove`, `size(key)`                          |                ✅ Yes                |      ❌ Intercepted       |             ✅ Yes              |
| **Async Single CRUD**    | `getAsync`, `setAsync`, `hasAsync`, `removeAsync`, `sizeAsync(key)` |                ✅ Yes                |          ✅ Yes           |             ✅ Yes              |
| **Sync Global Iterate**  | `clear()`, `keys()`, `size()`, `runGC()`                            |                ✅ Yes                |      ❌ Intercepted       |         ❌ Intercepted          |
| **Async Global Iterate** | `clearAsync()`, `keysAsync()`, `sizeAsync()`, `runGCAsync()`        |                ✅ Yes                |          ✅ Yes           |         ❌ Intercepted          |
| **Reactive Listener**    | `onChange(...)`                                                     |                ✅ Yes                |          ✅ Yes           |             ✅ Yes              |

---

## 🚀 Try It Online

> [!TIP]
> **Hot-Reload Sandbox Debugging**:
>
> 1. Click the button below to open the StackBlitz workspace.
> 2. The system automatically installs dependencies, builds multi-driver scopes, and starts local documentation preview.
> 3. Edit codes inside `packages/storage/src` on the left editor tree. The interactive playground below will hot-reload with your latest changes!

<div class="playground-container" style="align-items: center; justify-content: center; padding: 2rem 0; margin-top: 1rem;">
  <a href="https://stackblitz.com/github/vfiee/project-boilerplate?file=packages/storage/README.md&startScript=stackblitz:storage" target="_blank" style="text-decoration: none; display: inline-flex; align-items: center; gap: 8px; background-color: var(--vp-c-brand-1); color: white; padding: 10px 24px; border-radius: 8px; font-weight: 600; font-size: 1.1rem; transition: background-color 0.2s;" onmouseover="this.style.backgroundColor='var(--vp-c-brand-2)'" onmouseout="this.style.backgroundColor='var(--vp-c-brand-1)'">
    ⚡ Try VII Storage on StackBlitz
  </a>
</div>

---

## 💾 Getting Started Guide

### 1. Installation

Run in your project root directory:

```bash
pnpm add @vyron/storage
# OR
npm install @vyron/storage
```

### 2. Import Core and Drivers (Avoiding Bundle Bloating 💡)

To prevent unwanted dependencies from bloating your production bundles, drivers are exported via subpaths. When utilizing non-standard storage engines (like Cookie or IndexedDB), import them explicitly from their respective subpaths:

```typescript
// 1. Import core storage creator
import { createStorage } from "@vyron/storage";

// 2. Import specific storage drivers as needed
import { MemoryStorageDriver } from "@vyron/storage/drivers/custom";
import { CookieStorageDriver } from "@vyron/storage/drivers/cookie";
import { IndexedDBStorageDriver } from "@vyron/storage/drivers/indexeddb";
```

---

## 🛡️ Core Features & Code Explanations

### Feature 1: Draw Clear Boundaries (Namespace Isolation Prefix / Suffix)

- **The Problem**: If you host multiple sub-projects under the same domain, or deploy multi-tenant portals, keys in `localStorage` often override and conflict with each other.
- **The Solution**: Provide `prefix` or `suffix` configs to automatically bundle keys under safe isolated zones. No other projects will overwrite your private records.
- **Example**:

  ```typescript
  const storage = createStorage({
    prefix: "user_app_", // Auto prepend user_app_ to all keys
    suffix: "_v1", // Auto append _v1 to all keys
  });

  storage.set("token", "xyz");
  // Under the hood, the key written to LocalStorage is: "user_app_token_v1"
  ```

### Feature 2: Built-in Expiration Date (Expired data auto-cleanup TTL / GC)

- **The Problem**: Native LocalStorage keeps records permanently, leaving obsolete garbage to clog disk space without support for expiration thresholds.
- **The Solution**: Store values with custom cache expiration limits (TTL in **milliseconds**). Once the duration runs out, the data will self-destruct upon reading, cleaning up your disk space automatically.
- **Example**:

  ```typescript
  // Write a temporary value cache valid for 10 seconds
  storage.set("temp_code", "123456", 10 * 1000);

  // Read at the 9th second
  console.log(storage.get("temp_code")); // Output: "123456"

  // Read at the 11th second
  console.log(storage.get("temp_code")); // Output: null (expired data deleted automatically)

  // Explicitly scan and recycle all expired cache values globally to free up space
  storage.runGC();
  ```

### Feature 3: Anti-Tampering Signatures (Anti-fraud validation)

- **The Problem**: Tech-savvy users can easily open the F12 dev console and edit roles or permissions (e.g. changing `role: guest` to `role: admin`) to bypass frontend permissions.
- **The Solution**: Set up an encryption salt secret. The library writes cryptographical signatures beside key values. When manual modifications occur, validation checks detect mismatching signatures, delete the corrupted record automatically, and block unauthorized entry.
- **Example**:

  ```typescript
  const secureStorage = createStorage({
    secret: "my_secure_salt_key_123", // Encryption salting key
  });

  secureStorage.set("role", "admin");

  // If a user goes to DevTools and modifies "admin" to "super-admin":
  // The signature check fails and triggers validation block:
  console.log(secureStorage.get("role")); // Output: null (blocks access and deletes dirty record)
  ```

### Feature 4: Cross-tab Synchronous Broadcast (onChange)

- **Core Scenario**: When users log out in tab A (clearing local tokens), we want tab B to instantly detect the modification and reload or redirect users to the login portal.
- **Example**:
  ```typescript
  // Listen to changes on the token key
  storage.onChange("token", (newValue, oldValue) => {
    if (!newValue) {
      alert("Session expired, reloading page...");
      window.location.reload();
    }
  });
  ```

---

## 💾 Live Storage Playground

Run code snippets in the interactive sandbox below. The physical panel reflects changes inside LocalStorage, SessionStorage, Cookies, and IndexedDB instantly.

<ClientOnly>
  <StoragePlayground />
</ClientOnly>
