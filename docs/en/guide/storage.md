# Storage Manager (@vyron/storage)

`@vyron/storage` is a robust multi-driver local storage wrapper supporting TTL caching, salted signature anti-tampering checks, batch operations, and reactive cross-tab instance sync.

---

## 💻 Driver Compatibility Matrix

Core packages decouple Cookie and IndexedDB engines using subpath exports.

| API Type                    | Methods Included                                                    | Sync Drivers (Memory / Web / Cookie) | Async Drivers (IndexedDB) | Custom Drivers (No keys method) |
| :-------------------------- | :------------------------------------------------------------------ | :----------------------------------: | :-----------------------: | :-----------------------------: |
| **Sync Single CRUD**        | `get`, `set`, `has`, `remove`, `size(key)`                          |                ✅ Yes                |        ❌ Blocked         |             ✅ Yes              |
| **Async Single CRUD**       | `getAsync`, `setAsync`, `hasAsync`, `removeAsync`, `sizeAsync(key)` |                ✅ Yes                |          ✅ Yes           |             ✅ Yes              |
| **Sync Global Iterate**     | `clear()`, `keys()`, `size()`, `runGC()`                            |                ✅ Yes                |        ❌ Blocked         |           ❌ Blocked            |
| **Async Global Iterate**    | `clearAsync()`, `keysAsync()`, `sizeAsync()`, `runGCAsync()`        |                ✅ Yes                |          ✅ Yes           |           ❌ Blocked            |
| **Multi-Key Subscriptions** | `onChange(...)`                                                     |                ✅ Yes                |          ✅ Yes           |             ✅ Yes              |

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

## 💾 Live Storage Playground

Run code snippets in the interactive sandbox below. The physical panel reflects changes inside LocalStorage, SessionStorage, Cookies, and IndexedDB instantly.

<ClientOnly>
  <StoragePlayground />
</ClientOnly>
