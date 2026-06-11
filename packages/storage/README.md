# @vyron/storage

多引擎持久化存储管理包，提供统一的前/后缀命名空间隔离、过期时长控制、嵌套属性解析、批量事务操作、数据防篡改签名指纹校验、跨标签页多实例同步以及多维监控功能。

本包采用**插件化按需加载**设计，核心主包剔除了对 Cookie、IndexedDB 等非核心驱动的静态引用，以极大地减小主包体积（仅约 35kB），同时支持通过子路径（Subpath Exports）按需引入相应的存储驱动插件。

---

## 特性亮点

- 📦 **按需引入 & 极小体积**：核心主包体积仅约 35kB。Cookie、IndexedDB 及自定义驱动以子路径插件形式按需加载。
- 🚀 **多引擎支持**：内置 LocalStorage、SessionStorage、Memory 存储驱动，以及可选的 Cookie、IndexedDB 与通用自定义驱动插件。
- ⚖️ **纯异步驱动保护**：针对纯异步 IndexedDB 驱动，在调用同步 API（如 `get`/`set`）时进行拦截报错，确保链路逻辑严谨，引导使用 `Async` 后缀异步 API。
- 🔌 **通用第三方环境适配**：提供 `CustomStorageDriver` 自定义驱动适配器，仅需提供 `getItem`/`setItem`/`removeItem` 即可适配小程序（微信、uni-app）或 React Native 环境，并对缺失的遍历操作做安全拦截。
- 🛡️ **前/后缀空间隔离**：支持统一的 Key 前缀与后缀隔离，且 `clear()` 操作安全不越界。
- ⏳ **过期时长管理 (TTL)**：精确管理每一项数据的生存时间，并提供高效率的 GC 垃圾回收机制定时清理残留。
- 🔒 **防篡改数据指纹**：可选的完整性签名校验，一旦检测到物理存储介质中的数据遭到外部非法修改，自动执行静默丢弃。
- 📊 **高性能批量操作 & 事务回滚**：提供 `setItems`/`getItems`/`removeItems` 等高性能批量方法，并在同步写入时支持事务性失败回滚。
- 🔄 **跨标签多实例同步**：内置 BroadcastChannel 广播，自动维持多个页面/多实例的数据实时同步，并附带深度防抖值比对。

---

## 安装

```bash
pnpm add @vyron/storage
```

---

## 快速上手

### 1. 基础存储实例

新版本不再默认导出全局实例，您需要通过 `createStorage` 显式创建：

```typescript
import { createStorage } from "@vyron/storage";

// 创建 LocalStorage 存储包装实例
const local = createStorage("local");

// 创建 SessionStorage 存储包装实例
const session = createStorage("session");

// 基本写入与嵌套属性读取
local.set("config", {
  theme: "dark",
  user: { name: "admin", roles: ["user", "admin"] },
});

// 支持安全的嵌套 Path 解析与默认值兜底
const name = local.get("config", "user.name"); // "admin"
const firstRole = local.get("config", "user.roles[0]"); // "user"
const port = local.get("config", "server.port", 8080); // 8080 (属性不存在返回默认值)
```

### 2. 跨平台环境与 Memory 降级

在非浏览器环境（如 Node.js 或 SSR 服务端渲染阶段），主包会自动降级使用 `MemoryStorageDriver` 避免抛出 `window is not defined` 错误。

---

## 插件驱动与子路径按需引入

您可以直接从 `@vyron/storage/drivers` 汇总路径一次性引入所有存储驱动：

```typescript
import {
  MemoryStorageDriver,
  WebStorageDriver,
  CookieStorageDriver,
  IndexedDBStorageDriver,
  CustomStorageDriver,
} from "@vyron/storage/drivers";
```

当然，您也可以通过更细的子路径来进行按需导入，例如单独引入 Cookie 驱动：

### 1. Cookie 存储驱动

当需要使用 Cookie 进行数据持久化或需要控制 Domain、Path、SameSite 等高级属性时，请从子路径引入 Cookie 驱动：

```typescript
import { createStorage } from "@vyron/storage";
import { CookieStorageDriver } from "@vyron/storage/drivers/cookie";

// 实例化 Cookie 驱动并装载到存储包装器中
const cookie = createStorage(new CookieStorageDriver(), {
  cookieOptions: {
    path: "/",
    secure: true,
    sameSite: "Lax",
  },
});

// 写入 Cookie（过期时间 10 秒）
cookie.set("session_id", "xyz789", 10 * 1000);

// 获取 Cookie
const sessionId = cookie.get("session_id");
```

### 2. IndexedDB 存储驱动 (全异步)

当需要大容量存储且不阻塞主线程时，建议引入 IndexedDB 驱动：

```typescript
import { createStorage } from "@vyron/storage";
import { IndexedDBStorageDriver } from "@vyron/storage/drivers/indexeddb";

// 实例化异步底座，参数分别为数据库名与对象仓库名
const db = createStorage(new IndexedDBStorageDriver("my_database", "my_store"));

// [重要] 针对异步驱动，必须使用带 Async 后缀的异步 API 链！
async function run() {
  await db.setAsync("big_data", { text: "large volume text..." });
  const data = await db.getAsync("big_data");
}
```

> [!WARNING]
> **同步与异步 API 的冲突拦截**：
> 如果您对 IndexedDB 驱动尝试调用 `get()`、`set()` 等同步方法，包装器会立即抛出异常：
> `[StorageWrapper] Synchronous operation "get" is not supported on Asynchronous Driver "IndexedDBStorageDriver".`
> 请务必改用 `getAsync`、`setAsync` 等异步方法。

### 3. 自定义通用平台驱动 (如微信小程序 / uni-app)

通过子路径引入 `CustomStorageDriver`，只需传入核心的 CRUD 适配函数，即可完美集成到小程序或跨端平台：

```typescript
import { createStorage } from "@vyron/storage";
import { CustomStorageDriver } from "@vyron/storage/drivers/custom";

// 以微信小程序（wx.getStorageSync / wx.setStorageSync / wx.removeStorageSync）为例：
const miniDriver = new CustomStorageDriver({
  getItem: (key) => wx.getStorageSync(key) || null,
  setItem: (key, value) => {
    wx.setStorageSync(key, value);
  },
  removeItem: (key) => {
    wx.removeStorageSync(key);
  },
  // 小程序环境中不支持遍历所有 Keys，keys 可不传
});

const miniStore = createStorage(miniDriver, { prefix: "app_" });
miniStore.set("username", "wx_user");
console.log(miniStore.get("username")); // "wx_user"
```

> [!NOTE]
> 如果您未提供 `keys` 接口，高级迭代操作（例如：不传参的 `size()`、不传参的 `clear()` 以及 `runGC()`）在被调用时会自动抛出友好错误进行安全拦截，但不会影响单键的常规 CRUD 操作。

---

## 核心高级功能

### 1. 命名隔离与安全清理

```typescript
const store = createStorage("local", {
  prefix: "module_a_",
  suffix: "_prod",
});

store.set("token", "123"); // 实际物理键名: "module_a_token_prod"

// 安全清理：只会删除所有以 "module_a_" 开头且以 "_prod" 结尾的 Key，不会误删其他模块的数据
store.clear();
```

### 2. 过期时长控制 (TTL) 与垃圾回收 (GC)

```typescript
const store = createStorage("local", {
  expire: 60 * 1000, // 默认全局过期时间：60 秒
  gcInterval: 10 * 60 * 1000, // 每 10 分钟自动运行一次 GC 扫描
});

// 1. 使用全局过期默认值
store.set("itemA", "val");

// 2. 覆盖默认值，设为 10 秒后过期
store.set("itemB", "val", 10 * 1000);

// 3. 永不过期
store.set("itemC", "val", null);
```

### 3. 数据防篡改指纹校验

```typescript
const store = createStorage("local", {
  integrity: true, // 开启防篡改完整性签名校验
  secretSalt: "MY_SECURE_SALT_KEY", // 自定义签名加盐值
});

store.set("secret_key", "highly-confidential-value");

// 若外部直接在浏览器的 DevTools 中将存储的物理数据包修改，
// 当下一次 get() 时，校验签名失败，会打印警告并自动丢弃返回 null
const value = store.get("secret_key");
```

### 4. 高性能批量操作与事务回滚

```typescript
const store = createStorage("local");

// 1. 批量设置
store.setItems({
  keyA: "valueA",
  keyB: "valueB",
});

// 2. 批量获取
const data = store.getItems(["keyA", "keyB"]); // { keyA: "valueA", keyB: "valueB" }

// 3. 批量删除
store.removeItems(["keyA", "keyB"]);
```

> [!TIP]
> **事务回滚机制**：
> 在执行 `setItems` 同步批量写入时，如果其中某个键值在写入底座时报错（例如浏览器配额超限 `QuotaExceeded`），程序将自动执行物理与内存回滚，把已经成功写入的键还原为修改前的状态，从而确保数据状态的原子性。

### 5. 跨实例多键值联动订阅 (onChange)

```typescript
const store = createStorage("local");

// 1. 订阅单键变化
const unsubscribeA = store.onChange("theme", (newValue) => {
  console.log("新主题：", newValue);
});

// 2. 订阅多键变化（支持深度比对，仅在值发生变化时触发回调，避免重复触发）
const unsubscribeB = store.onChange(["theme", "lang"], (key, newValue) => {
  console.log(`发生改变的键: ${key}, 新值: ${newValue}`);
});

// 卸载订阅
unsubscribeA();
unsubscribeB();
```

---

## 支持的存储驱动 (Storage Drivers)

本包提供并支持以下 5 种存储驱动，您可根据应用场景和目标运行环境自由选择或组合：

1.  **`MemoryStorageDriver`**：纯内存实现的同步存储驱动。主要用于非浏览器环境（Node.js 服务端渲染）下的平滑降级，或是临时会话级别的数据存储。
2.  **`WebStorageDriver`**：对浏览器原生 `localStorage` 和 `sessionStorage` 的高可用封装，为常用的同步介质。
3.  **`CookieStorageDriver`**：封装浏览器原生 `document.cookie` 的同步驱动，支持过期时长（Max-Age）并可在配置中统一控制域（Domain）、路径（Path）和同源策略（SameSite）等属性。
4.  **`IndexedDBStorageDriver`**：基于浏览器原生 IndexedDB 事务封装的**纯异步**大容量本地存储驱动。该驱动的所有底层操作均为非阻塞式异步（返回 `Promise`），非常适合存储结构复杂、体积较大的业务数据。
5.  **`CustomStorageDriver`**：万能跨端平台自定义适配驱动。可通过传入同步或异步的平台专属 `getItem`/`setItem`/`removeItem` 方法，自适应运行在微信小程序、uni-app、React Native 等任意非 Web 容器中。

---

## 驱动与 API 极简兼容矩阵

为了降低理解成本，您只需掌握以下 **3 条基本法则**：

1.  **异步方法全能**：所有带 `Async` 后缀的异步 API（如 `getAsync`/`setAsync`）支持 **所有驱动**。即使是对同步驱动（如 LocalStorage）调用异步 API，也会被自动包裹为 Promise 正常运行。
2.  **异步驱动禁止同步调用**：全异步驱动（如 `IndexedDB`）**只支持带 `Async` 后缀的异步 API**。如果强行调用同步 API（如 `get`/`set`），会在运行时直接报错拦截。
3.  **遍历操作受限于 `keys` 方法**：如果在自定义驱动中没有实现 `keys()` 遍历接口（如某些小程序环境），那么任何需要遍历所有键的方法（如 `clear`、无参 `size`、`runGC`）在调用时会抛出不支持的错误，但常规的单键 CRUD（`get`/`set`/`remove`）不受任何影响。

### 兼容关系速查表

| API 类型          | 包含的方法                                                             | 同步驱动<br>(Memory / Web / Cookie) | 异步驱动<br>(IndexedDB) | 自定义驱动<br>(缺失 keys 遍历) |
| :---------------- | :--------------------------------------------------------------------- | :---------------------------------: | :---------------------: | :----------------------------: |
| **同步单键 CRUD** | `get`, `set`, `has`, `remove`, `size(key)` 等                          |               ✅ 支持               |       ❌ 报错拦截       |            ✅ 支持             |
| **异步单键 CRUD** | `getAsync`, `setAsync`, `hasAsync`, `removeAsync`, `sizeAsync(key)` 等 |               ✅ 支持               |         ✅ 支持         |            ✅ 支持             |
| **同步全局遍历**  | `clear()`, `keys()`, 无参 `size()`, `runGC()`                          |               ✅ 支持               |       ❌ 报错拦截       |          ❌ 报错拦截           |
| **异步全局遍历**  | `clearAsync()`, `keysAsync()`, 无参 `sizeAsync()`, `runGCAsync()`      |               ✅ 支持               |         ✅ 支持         |          ❌ 报错拦截           |
| **多键联动监听**  | `onChange(...)`                                                        |               ✅ 支持               |         ✅ 支持         |            ✅ 支持             |

---

## 异步驱动专属物理监控 API

对于全异步的底层驱动（如 `IndexedDBStorageDriver`），除了上述通用包装方法外，驱动本身还额外向外暴露了物理层面的度量 API：

- `totalCount()`: 获取当前数据库仓库中实际存储的物理条目总数（返回 `Promise<number>`）。
- `totalSize()`: 累加计算当前数据库仓库中所有物理数据的总字符大小（单位：字符数/字节数，返回 `Promise<number>`）。
