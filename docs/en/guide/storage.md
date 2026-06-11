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

## 💾 Live Storage Playground

Run code snippets in the interactive sandbox below. The physical panel reflects changes inside LocalStorage, SessionStorage, Cookies, and IndexedDB instantly.

<ClientOnly>
  <StoragePlayground />
</ClientOnly>
