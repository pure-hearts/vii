# Storage 存储管理器 (@vyron/storage)

`@vyron/storage` 是一个支持多驱动（Memory, Web, Cookie, IndexedDB, Custom）、过期时间 TTL 控制、防篡改签名加盐校验、高并发事务回滚及跨标签实例联动订阅的高可用本地数据存储包装库。

---

## 💻 驱动兼容性矩阵

为了实现包体积的极致优化，核心包装器剔除了对特殊引擎（如 Cookie, IndexedDB）的静态引入，需要通过**子路径按需导入**相应驱动。

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

## 💾 核心交互式 Playground

您可以在下方内置的代码沙盒中，编辑并运行关于 `@vyron/storage` 的代码。运行后，右侧/下方的监视器会实时将浏览器物理存储介质的改变绘制出来，为您展示前后缀空间隔离、数据指纹校验、TTL 超时与手动 GC 清理效果。

<ClientOnly>
  <StoragePlayground />
</ClientOnly>
