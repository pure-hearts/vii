# Storage 存储管理器 (@vyron/storage)

`@vyron/storage` 并不是简单地封装了浏览器自带的 `localStorage`。它就像是**“给浏览器存数据用的智能保险箱”**，支持多驱动扩展（Memory、LocalStorage、SessionStorage、Cookie、IndexedDB）、过期缓存（TTL）控制、防篡改签名加盐校验、高并发事务回滚以及跨标签页数据同步联动订阅。

---

## 💻 驱动兼容性矩阵

为了实现包体积的极致优化（核心打包体积仅 ~35kB），核心包剔除了对 Cookie、IndexedDB 等特殊引擎的静态引入，采用 **Subpath 按需导入** 机制。

| API 类型          | 包含的方法                                                             | 同步驱动 (Memory / Web / Cookie) | 异步驱动 (IndexedDB) | 自定义驱动 (缺失 keys 接口) |
| :---------------- | :--------------------------------------------------------------------- | :------------------------------: | :------------------: | :-------------------------: |
| **同步单键 CRUD** | `get`, `set`, `has`, `remove`, `size(key)` 等                          |             ✅ 支持              |     ❌ 报错拦截      |           ✅ 支持           |
| **异步单键 CRUD** | `getAsync`, `setAsync`, `hasAsync`, `removeAsync`, `sizeAsync(key)` 等 |             ✅ 支持              |       ✅ 支持        |           ✅ 支持           |
| **同步全局遍历**  | `clear()`, `keys()`, 无参 `size()`, `runGC()`                          |             ✅ 支持              |     ❌ 报错拦截      |         ❌ 报错拦截         |
| **异步全局遍历**  | `clearAsync()`, `keysAsync()`, 无参 `sizeAsync()`, `runGCAsync()`      |             ✅ 支持              |       ✅ 支持        |         ❌ 报错拦截         |
| **多键联动监听**  | `onChange(...)`                                                        |             ✅ 支持              |       ✅ 支持        |           ✅ 支持           |

---

## 🚀 在线尝试

> [!TIP]
> **物理热更新调试体验**：
>
> 1. 点击下方按钮打开 StackBlitz 工作区。
> 2. 系统会自动安装依赖、构建多驱动包并自动开启文档本地预览服务。
> 3. 您可以在左侧文件树中修改 `packages/storage/src` 下的驱动或核心源码，下方内置的交互式 Playground 会实时反应最新效果。

<div class="playground-container" style="align-items: center; justify-content: center; padding: 2rem 0; margin-top: 1rem;">
  <a href="https://stackblitz.com/github/vfiee/project-boilerplate?file=packages/storage/README.md&startScript=stackblitz:storage" target="_blank" style="text-decoration: none; display: inline-flex; align-items: center; gap: 8px; background-color: var(--vp-c-brand-1); color: white; padding: 10px 24px; border-radius: 8px; font-weight: 600; font-size: 1.1rem; transition: background-color 0.2s;" onmouseover="this.style.backgroundColor='var(--vp-c-brand-2)'" onmouseout="this.style.backgroundColor='var(--vp-c-brand-1)'">
    ⚡ 立即在 StackBlitz 中尝试 VII Storage
  </a>
</div>

---

## 💾 快速上手说明

### 1. 依赖安装

在您的项目目录中运行：

```bash
pnpm add @vyron/storage
# 或者使用 npm
npm install @vyron/storage
```

### 2. 引入核心与驱动包 (避坑指南 💡)

为了控制打包体积，项目采用了分包按需导出。如果您需要使用不同的物理存储引擎（比如 Cookie 或 IndexedDB），必须分别从其子路径中单独导入：

```typescript
// 1. 引入创建管理器的方法
import { createStorage } from "@vyron/storage";

// 2. 按需引入您所需要的物理存储驱动引擎
import { MemoryStorageDriver } from "@vyron/storage/drivers/custom";
import { CookieStorageDriver } from "@vyron/storage/drivers/cookie";
import { IndexedDBStorageDriver } from "@vyron/storage/drivers/indexeddb";
```

---

## 🛡️ 核心用法与代码详解

### 特性 1：自动画地为牢（数据隔离 Prefix / Suffix）

- **新手痛点**：在同一个域名下部署了多个子项目时，不同项目存的数据很容易发生名字冲突，导致互相覆盖和乱套。
- **解决方案**：通过给 `@vyron/storage` 配置前缀 `prefix` 或后缀 `suffix`，它就会自动在后台为所有的键拼接安全的隔离空间。无论别人怎么在同一个网站里折腾，都不会覆盖你的数据。
- **代码示例**：

  ```typescript
  const storage = createStorage({
    prefix: "user_app_", // 自动为所有键前置 user_app_
    suffix: "_v1", // 自动为所有键后置 _v1
  });

  storage.set("token", "xyz");
  // 实际上物理写入浏览器的键为: "user_app_token_v1"
  ```

### 特性 2：自带保质期（过期自动销毁 TTL / GC）

- **新手痛点**：浏览器自带的 LocalStorage 是永久存储的，经常会留下堆积如山的过期垃圾，无法配置生存时间。
- **解决方案**：支持存入数据时，给它贴上一个“保质期”（以**毫秒**为单位的缓存过期时间）。过期之后再读取它，它会自动消失并帮你把浏览器空间清理干净。同时提供“主动 GC”来定期释放空间。
- **代码示例**：

  ```typescript
  // 写入一个 10 秒后过期的临时数据
  storage.set("temp_code", "123456", 10 * 1000);

  // 9秒时读取
  console.log(storage.get("temp_code")); // 输出: "123456"

  // 11秒时读取
  console.log(storage.get("temp_code")); // 输出: null (数据已过期并被自动清理)

  // 主动清扫全盘所有已过期的键，释放浏览器物理空间
  storage.runGC();
  ```

### 特性 3：防伪防篡改指纹 (Signature)

- **新手痛点**：懂一点技术的人可以轻易通过浏览器的 F12 开发者工具，手动修改 LocalStorage 里的高敏感数据（如用户角色权限由 guest 改为 admin），以此绕过前端限制。
- **解决方案**：配置签名盐值密码。写入数据时工具会自动生成防伪数字指纹。当坏人强行在控制台修改数据时，网页在读取时一验指纹对不上，会判定数据被篡改并直接将其销毁，从而保护系统安全。
- **代码示例**：

  ```typescript
  const secureStorage = createStorage({
    // 启用防篡改校验，并传入防伪密码
    secret: "my_secure_salt_key_123",
  });

  secureStorage.set("role", "admin");

  // 此时如果在 F12 控制台手动将 "admin" 修改为 "super-admin"
  // 读取时由于指纹密码对不上，会触发拦截：
  console.log(secureStorage.get("role")); // 输出: null (安全拦截，防篡改触发)
  ```

### 特性 4：跨标签页联动广播 (onChange)

- **核心场景**：当用户在网页 A 标签页退出了登录（清除了 token），我们希望已打开的 B 标签页也立刻能感知到变动，并自动跳转登录页，它能帮你一秒钟完成广播。
- **代码示例**：
  ```typescript
  // 订阅 token 键的改变
  storage.onChange("token", (newValue, oldValue) => {
    if (!newValue) {
      alert("您的登录已在其他窗口失效，正在跳转...");
      window.location.reload();
    }
  });
  ```

---

## 💾 核心交互式 Playground

您可以在下方内置的代码沙盒中，编辑并运行关于 `@vyron/storage` 的代码。运行后，右侧/下方的监视器会实时将浏览器物理存储介质的改变绘制出来，为您展示前后缀空间隔离、数据指纹校验、TTL 超时与手动 GC 清理效果。

<ClientOnly>
  <StoragePlayground />
</ClientOnly>
