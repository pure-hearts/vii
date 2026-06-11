import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { setupTestEnv, cookieState, mockIndexedDBState } from "../helpers";
import { createStorage } from "../../src/index";
import { CookieStorageDriver } from "../../src/drivers/cookie";
import { IndexedDBStorageDriver } from "../../src/drivers/indexeddb";
import { CustomStorageDriver } from "../../src/drivers/custom";
import type { Serializer, StorageDriver } from "../../src/index";

const local = createStorage("local");
const session = createStorage("session");
const cookie = createStorage(new CookieStorageDriver());

beforeAll(() => {
  setupTestEnv();
});

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  cookieState.clear();
  mockIndexedDBState.clear();
});

describe("@vyron/storage 集成测试", () => {
  describe("基本功能与 Local/Session 引擎集成", () => {
    it("支持默认实例基本读写", () => {
      local.set("num", 100);
      expect(local.get("num")).toBe(100);

      session.set("str", "hello");
      expect(session.get("str")).toBe("hello");
    });

    it("支持 has() 及 remove()", () => {
      local.set("test_key", "val");
      expect(local.has("test_key")).toBe(true);

      local.remove("test_key");
      expect(local.has("test_key")).toBe(false);
      expect(local.get("test_key")).toBeUndefined();
    });

    it("支持默认值 fallback", () => {
      expect(local.get("non_existing", undefined, "default")).toBe("default");
    });
  });

  describe("多级嵌套 path 获取集成", () => {
    it("支持复杂嵌套路径安全提取", () => {
      local.set("data", {
        user: {
          name: "vyron",
          roles: ["admin", "editor"],
          profile: {
            age: 18,
          },
        },
      });

      expect(local.get("data", "user.name")).toBe("vyron");
      expect(local.get("data", "user.profile.age")).toBe(18);
      expect(local.get("data", "user.roles[0]")).toBe("admin");
      expect(local.get("data", "user.roles[1]")).toBe("editor");
      expect(local.get("data", "user.profile.gender", "male")).toBe("male");
      expect(local.get("data", "user.non_exist[0]", "fallback")).toBe("fallback");
    });
  });

  describe("过期时间控制 (Expire) 集成", () => {
    it("单次 set 过期时间应有效", async () => {
      local.set("expire_key", "quick_val", 20); // 20ms 过期
      expect(local.get("expire_key")).toBe("quick_val");

      await new Promise((resolve) => setTimeout(resolve, 35));

      expect(local.get("expire_key", undefined, "expired")).toBe("expired");
      expect(window.localStorage.getItem("expire_key")).toBeNull();
    });

    it("实例默认过期时间应有效", async () => {
      const timedStore = createStorage("local", { expire: 20 });
      timedStore.set("timed_key", "timed_val");
      expect(timedStore.get("timed_key")).toBe("timed_val");

      await new Promise((resolve) => setTimeout(resolve, 35));
      expect(timedStore.get("timed_key", undefined, "expired")).toBe("expired");
    });
  });

  describe("命名空间前缀与后缀隔离集成", () => {
    it("存取时应自动加前缀和后缀，且只在 clear() 时清理自身空间", () => {
      const storeA = createStorage("local", { prefix: "a_", suffix: "_x" });
      const storeB = createStorage("local", { prefix: "b_" });

      storeA.set("key", "valA");
      storeB.set("key", "valB");

      expect(window.localStorage.getItem("a_key_x")).not.toBeNull();
      expect(window.localStorage.getItem("b_key")).not.toBeNull();

      expect(storeA.get("key")).toBe("valA");
      expect(storeB.get("key")).toBe("valB");

      storeA.clear();
      expect(storeA.has("key")).toBe(false);
      expect(storeB.has("key")).toBe(true);
    });
  });

  describe("Cookie 驱动集成与高级参数", () => {
    it("支持 Cookie 引擎的读写、隔离与 clear()", () => {
      const cookieStoreInstance = createStorage(new CookieStorageDriver(), { prefix: "ck_" });
      cookieStoreInstance.set("theme", "light");

      expect(cookieStoreInstance.get("theme")).toBe("light");
      expect(cookieState.store).toContain("ck_theme");

      cookieStoreInstance.clear();
      expect(cookieStoreInstance.has("theme")).toBe(false);
    });

    it("支持 Cookie 的嵌套 path 读取", () => {
      cookie.set("user", { info: { name: "test_cookie" } });
      expect(cookie.get("user", "info.name")).toBe("test_cookie");
    });

    it("支持 Cookie 高级写入修饰符配置", () => {
      const advancedCookie = createStorage(new CookieStorageDriver(), {
        cookieOptions: {
          path: "/custom",
          domain: "example.com",
          secure: true,
          sameSite: "Strict",
        },
      });

      advancedCookie.set("session", "xyz");
      expect(cookieState.lastSetRawCookie).toContain("path=/custom");
      expect(cookieState.lastSetRawCookie).toContain("domain=example.com");
      expect(cookieState.lastSetRawCookie).toContain("secure");
      expect(cookieState.lastSetRawCookie).toContain("SameSite=Strict");
    });
  });

  describe("高级集成特性 (SSR 降级、Serializer、TypeScript、Event 监听)", () => {
    it("在无 window/document 环境下应自适应降级为 MemoryStorageDriver 且不崩溃", () => {
      const origWindow = globalThis.window;
      const origDocument = globalThis.document;

      try {
        // @ts-ignore
        delete globalThis.window;
        // @ts-ignore
        delete globalThis.document;

        const ssrStore = createStorage("local");
        ssrStore.set("ssr_key", "ssr_value");
        expect(ssrStore.get("ssr_key")).toBe("ssr_value");
        expect(ssrStore.has("ssr_key")).toBe(true);

        const ssrCookie = createStorage(new CookieStorageDriver());
        ssrCookie.set("ssr_ck", "val");
        expect(ssrCookie.get("ssr_ck")).toBe("val");
      } finally {
        globalThis.window = origWindow;
        globalThis.document = origDocument;
      }
    });

    it("支持自定义 Serializer 加解密或数据改写", () => {
      const plusTwoSerializer: Serializer = {
        serialize: (val) => {
          return JSON.stringify({ ...val, value: val.value + 2 });
        },
        deserialize: (str) => {
          const parsed = JSON.parse(str);
          return { ...parsed, value: parsed.value - 2 };
        },
      };

      const plusStore = createStorage("local", { serializer: plusTwoSerializer });
      plusStore.set("number", 100);

      const rawItem = window.localStorage.getItem("number");
      expect(rawItem).toContain('"value":102');
      expect(plusStore.get("number")).toBe(100);
    });

    it("提供 TypeScript 泛型 Schema 强类型约束编译校验", () => {
      interface AppSchema {
        count: number;
        msg: string;
      }

      const typedStore = createStorage<AppSchema>("local");
      typedStore.set("count", 42);

      // @ts-expect-error - 类型不符报错
      typedStore.set("count", "not_a_number");

      // @ts-expect-error - key名不存在报错
      typedStore.set("invalid_key", "value");
    });

    it("支持 onChange 跨标签页/窗口的 LocalStorage 数据变化监听与 destroy 销毁", () => {
      const activeLocal = createStorage("local");
      let receivedVal: any = undefined;
      const unsubscribe = activeLocal.onChange("sync_key", (val) => {
        receivedVal = val;
      });

      const event = new StorageEvent("storage", {
        key: "sync_key",
        newValue: JSON.stringify({ value: "hello_event", expire: null }),
        storageArea: window.localStorage,
      });
      window.dispatchEvent(event);

      expect(receivedVal).toBe("hello_event");

      unsubscribe();
      receivedVal = undefined;

      window.dispatchEvent(event);
      expect(receivedVal).toBeUndefined();

      let count = 0;
      activeLocal.onChange("sync_key", () => {
        count++;
      });
      activeLocal.destroy();

      window.dispatchEvent(event);
      expect(count).toBe(0);
    });

    it("支持自定义驱动注入 (插件化驱动架构)", () => {
      const customStoreMap = new Map<string, string>();
      const mockDriver: StorageDriver = {
        getItem: (key: string) => customStoreMap.get(key) ?? null,
        setItem: (key: string, value: string, expireTime?: number | null, options?: any) => {
          customStoreMap.set(key, value);
        },
        removeItem: (key: string) => {
          customStoreMap.delete(key);
        },
        hasItem: (key: string) => customStoreMap.has(key),
        clear: () => {
          customStoreMap.clear();
        },
        keys: () => Array.from(customStoreMap.keys()),
        getItems: (keys: string[]) => {
          const res: Record<string, string | null> = {};
          keys.forEach((k) => {
            res[k] = customStoreMap.get(k) ?? null;
          });
          return res;
        },
        setItems: (pairs: Record<string, string>, expireTime?: number | null, options?: any) => {
          Object.entries(pairs).forEach(([k, v]) => {
            customStoreMap.set(k, v);
          });
        },
        removeItems: (keys: string[]) => {
          keys.forEach((k) => {
            customStoreMap.delete(k);
          });
        },
        size: (keyOrKeys?: any): any => {
          if (keyOrKeys === undefined) {
            return customStoreMap.size;
          }
          if (Array.isArray(keyOrKeys)) {
            const sizes: Record<string, number> = {};
            keyOrKeys.forEach((k) => {
              sizes[k] = (customStoreMap.get(k) ?? "").length;
            });
            return sizes;
          }
          return (customStoreMap.get(keyOrKeys) ?? "").length;
        },
        subscribe: (key: string | string[] | null, callback: (key: string, newValue: string | null) => void) => () => {},
        totalCount: () => customStoreMap.size,
        totalSize: () => Array.from(customStoreMap.values()).reduce((acc, v) => acc + v.length, 0),
      };

      const storage = createStorage(mockDriver, { prefix: "custom_" });
      storage.set("token", "my_token");

      expect(customStoreMap.get("custom_token")).not.toBeUndefined();
      expect(storage.get("token")).toBe("my_token");

      storage.clear();
      expect(customStoreMap.size).toBe(0);
    });

    it("支持批量读取、写入和删除方法 (getItems / setItems / removeItems)", () => {
      local.setItems({
        theme: "dark",
        user: { name: "alex", age: 20 },
        lang: "zh",
      });

      expect(local.get("theme")).toBe("dark");
      expect(local.get("user", "name")).toBe("alex");

      const result = local.getItems(["theme", "user", "lang"]);
      expect(result.theme).toBe("dark");
      expect(result.user.name).toBe("alex");
      expect(result.lang).toBe("zh");

      const pathResult = local.getItems(["user"], "name");
      expect(pathResult.user).toBe("alex");

      local.removeItems(["theme", "lang"]);
      expect(local.has("theme")).toBe(false);
      expect(local.has("lang")).toBe(false);
      expect(local.has("user")).toBe(true);
    });

    it("支持 size() 对全部、单个与批量参数的重载", () => {
      local.clear();
      local.set("a", "hello");
      local.set("b", "world");

      expect(local.size()).toBe(2);

      const sizeA = local.size("a");
      expect(sizeA).toBeGreaterThan(10);

      const sizes = local.size(["a", "b"]);
      expect(sizes.a).toBe(sizeA);
      expect(sizes.b).toBeGreaterThan(10);
    });

    it("支持 onChange() 多键同时订阅监听", () => {
      const activeLocal = createStorage("local");
      const triggeredKeys: string[] = [];
      const triggeredVals: any[] = [];

      activeLocal.onChange(["sync_a", "sync_b"], (key, val) => {
        triggeredKeys.push(key);
        triggeredVals.push(val);
      });

      const eventA = new StorageEvent("storage", {
        key: "sync_a",
        newValue: JSON.stringify({ value: "valA", expire: null }),
        storageArea: window.localStorage,
      });
      window.dispatchEvent(eventA);

      const eventB = new StorageEvent("storage", {
        key: "sync_b",
        newValue: JSON.stringify({ value: "valB", expire: null }),
        storageArea: window.localStorage,
      });
      window.dispatchEvent(eventB);

      expect(triggeredKeys).toContain("sync_a");
      expect(triggeredKeys).toContain("sync_b");
      expect(triggeredVals).toContain("valA");
      expect(triggeredVals).toContain("valB");
    });

    it("支持 beforeSet/afterSet/beforeGet/afterGet 拦截器切面逻辑", () => {
      const log: string[] = [];
      const store = createStorage("local", {
        interceptors: [
          {
            beforeSet: (ctx) => {
              log.push(`beforeSet:${ctx.key}`);
              if (ctx.key === "msg") {
                return { ...ctx, value: ctx.value + "!" };
              }
            },
            afterSet: (ctx) => {
              log.push(`afterSet:${ctx.key}`);
            },
            beforeGet: (key) => {
              log.push(`beforeGet:${key}`);
            },
            afterGet: (key, val) => {
              log.push(`afterGet:${key}`);
              return val + "?";
            },
          },
        ],
      });

      store.set("msg", "hello");
      expect(log).toEqual(["beforeSet:msg", "afterSet:msg"]);
      
      const res = store.get("msg");
      expect(res).toBe("hello!?");
      expect(log).toEqual(["beforeSet:msg", "afterSet:msg", "beforeGet:msg", "afterGet:msg"]);
    });

    it("支持配额超限时自动 GC 清理和 onQuotaExceeded 回调机制", () => {
      let gcCalled = false;
      let callbackCalled = false;
      let failedKey = "";

      const quotaDriver: StorageDriver = {
        getItem: () => null,
        setItem: (key: string, value: string, expireTime?: number | null, options?: any) => {
          const err = new Error("Quota exceeded");
          err.name = "QuotaExceededError";
          throw err;
        },
        removeItem: () => {},
        hasItem: () => false,
        clear: () => {},
        keys: () => ["expired_key"],
        getItems: () => ({}),
        setItems: () => {},
        removeItems: () => {},
        size: (keyOrKeys?: any): any => 0,
        subscribe: (key: string | string[] | null, callback: (key: string, newValue: string | null) => void) => () => {},
        totalCount: () => 1,
        totalSize: () => 0,
      };

      const store = createStorage(quotaDriver, {
        onQuotaExceeded: (err, ctx) => {
          callbackCalled = true;
          failedKey = ctx.key;
        },
      });

      const origRunGC = store.runGC;
      store.runGC = () => {
        gcCalled = true;
        origRunGC.call(store);
      };

      store.set("test_quota", "val");

      expect(gcCalled).toBe(true);
      expect(callbackCalled).toBe(true);
      expect(failedKey).toBe("test_quota");
    });

    it("支持 setItems 批量写入的原子性与事务回滚", () => {
      const storeMap = new Map<string, string>();
      storeMap.set("a", JSON.stringify({ value: "old_a", expire: null }));

      const failingDriver: StorageDriver = {
        getItem: (key: string) => storeMap.get(key) ?? null,
        setItem: (key: string, value: string, expireTime?: number | null, options?: any) => {
          if (key.includes("b")) {
            const err = new Error("Quota exceeded");
            err.name = "QuotaExceededError";
            throw err;
          }
          storeMap.set(key, value);
        },
        removeItem: (key: string) => {
          storeMap.delete(key);
        },
        hasItem: (key: string) => storeMap.has(key),
        clear: () => storeMap.clear(),
        keys: () => Array.from(storeMap.keys()),
        getItems: (keys: string[]) => {
          const res: Record<string, string | null> = {};
          keys.forEach((k) => {
            res[k] = storeMap.get(k) ?? null;
          });
          return res;
        },
        setItems: (pairs: Record<string, string>, expireTime?: number | null, options?: any) => {},
        removeItems: () => {},
        size: (keyOrKeys?: any): any => 0,
        subscribe: (key: string | string[] | null, callback: (key: string, newValue: string | null) => void) => () => {},
        totalCount: () => storeMap.size,
        totalSize: () => Array.from(storeMap.values()).reduce((acc, v) => acc + v.length, 0),
      };

      let callbackTriggered = false;
      const store = createStorage(failingDriver, {
        onQuotaExceeded: () => {
          callbackTriggered = true;
        },
      });

      store.setItems({
        a: "new_a",
        b: "val_b",
      });

      expect(callbackTriggered).toBe(true);
      expect(store.get("a")).toBe("old_a");
      expect(store.has("b")).toBe(false);
    });

    it("支持读缓存与写直达，高频读取时不重复穿透物理驱动", () => {
      let readCount = 0;
      const customStoreMap = new Map<string, string>();

      const cacheMockDriver: StorageDriver = {
        getItem: (key: string) => {
          readCount++;
          return customStoreMap.get(key) ?? null;
        },
        setItem: (key: string, value: string) => {
          customStoreMap.set(key, value);
        },
        removeItem: (key: string) => {
          customStoreMap.delete(key);
        },
        hasItem: (key: string) => customStoreMap.has(key),
        clear: () => customStoreMap.clear(),
        keys: () => Array.from(customStoreMap.keys()),
        getItems: (keys: string[]) => {
          const res: Record<string, string | null> = {};
          keys.forEach((k) => {
            res[k] = customStoreMap.get(k) ?? null;
          });
          return res;
        },
        setItems: (pairs: Record<string, string>, expireTime?: number | null, options?: any) => {},
        removeItems: () => {},
        size: (keyOrKeys?: any): any => 0,
        subscribe: (key: string | string[] | null, callback: (key: string, newValue: string | null) => void) => () => {},
        totalCount: () => 0,
        totalSize: () => 0,
      };

      const store = createStorage(cacheMockDriver);
      store.set("cache_key", "hello");

      expect(store.get("cache_key")).toBe("hello");
      expect(store.get("cache_key")).toBe("hello");
      expect(store.get("cache_key")).toBe("hello");

      expect(readCount).toBe(0);

      customStoreMap.clear();
      expect(store.get("cache_key")).toBe("hello");
    });

    it("支持订阅变动时的值改变深度对比过滤", () => {
      const activeLocal = createStorage("local");
      let triggerCount = 0;

      activeLocal.onChange("deep_key", () => {
        triggerCount++;
      });

      const event1 = new StorageEvent("storage", {
        key: "deep_key",
        newValue: JSON.stringify({ value: { name: "alex", age: 20 }, expire: null }),
        storageArea: window.localStorage,
      });
      window.dispatchEvent(event1);

      const event2 = new StorageEvent("storage", {
        key: "deep_key",
        newValue: JSON.stringify({ value: { name: "alex", age: 20 }, expire: null }),
        storageArea: window.localStorage,
      });
      window.dispatchEvent(event2);

      const event3 = new StorageEvent("storage", {
        key: "deep_key",
        newValue: JSON.stringify({ value: { name: "alex", age: 21 }, expire: null }),
        storageArea: window.localStorage,
      });
      window.dispatchEvent(event3);

      expect(triggerCount).toBe(2);
    });

    it("支持 size() 的命名空间过滤及 StorageDriver 的 totalCount/totalSize 监控", () => {
      local.clear();
      const storeA = createStorage("local", { prefix: "appA_" });
      const storeB = createStorage("local", { prefix: "appB_" });

      storeA.set("k1", "a1");
      storeA.set("k2", "a2");
      storeB.set("k1", "b1");

      expect(storeA.size()).toBe(2);
      expect(storeB.size()).toBe(1);

      const driver = (storeA as any).driver as StorageDriver;
      expect(driver.totalCount()).toBe(3);
      expect(driver.totalSize()).toBeGreaterThan(50);
    });

    it("支持 integrity 数据指纹签名校验及防篡改物理擦除", () => {
      const store = createStorage("local", { integrity: true, secretSalt: "my_test_salt" });
      
      store.set("secure_key", "secure_val");
      expect(store.get("secure_key")).toBe("secure_val");

      const rawSerialized = window.localStorage.getItem("secure_key")!;
      const data = JSON.parse(rawSerialized);
      data.value = "hacked_val";
      window.localStorage.setItem("secure_key", JSON.stringify(data));

      (store as any).cache.clear();

      expect(store.get("secure_key")).toBeUndefined();
      expect(window.localStorage.getItem("secure_key")).toBeNull();
    });

    describe("四期扩展集成特性 (IndexedDB 异步驱动, BroadcastChannel 跨实例通信)", () => {
      it("支持 IndexedDBStorageDriver 的全套异步 API 调用及性能缓存命中", async () => {
        const dbDriver = new IndexedDBStorageDriver("int_db", "int_store");
        const store = createStorage(dbDriver, { prefix: "app_" });
        await store.clearAsync();

        // setAsync & getAsync
        await store.setAsync("user", { name: "vyron" });
        const user = await store.getAsync("user");
        expect(user).toEqual({ name: "vyron" });

        // hasAsync
        expect(await store.hasAsync("user")).toBe(true);
        expect(await store.hasAsync("non_exist")).toBe(false);

        // sizeAsync (单个, 批量, 全部)
        expect(await store.sizeAsync("user")).toBeGreaterThan(0);
        await store.setAsync("age", 18);
        const sizes = await store.sizeAsync(["user", "age", "none"]);
        expect(sizes.user).toBeGreaterThan(0);
        expect(sizes.age).toBeGreaterThan(0);
        expect(sizes.none).toBe(0);
        expect(await store.sizeAsync()).toBe(2);

        // getItemsAsync & setItemsAsync
        await store.setItemsAsync({ token: "abc", session: "xyz" });
        const items = await store.getItemsAsync(["token", "session", "none"]);
        expect(items).toEqual({ token: "abc", session: "xyz", none: undefined });

        // removeAsync & removeItemsAsync
        await store.removeAsync("token");
        expect(await store.getAsync("token")).toBeUndefined();
        await store.removeItemsAsync(["session", "age"]);
        expect(await store.getAsync("session")).toBeUndefined();

        // clearAsync
        expect(await store.sizeAsync()).toBe(1); // 剩 user
        await store.clearAsync();
        expect(await store.sizeAsync()).toBe(0);
      });

      it("在异步驱动上调用同步方法应抛出友好错误", () => {
        const dbDriver = new IndexedDBStorageDriver("int_db", "int_store");
        const store = createStorage(dbDriver);

        expect(() => store.get("test")).toThrow("IndexedDBStorageDriver");
        expect(() => store.set("test", "val")).toThrow("IndexedDBStorageDriver");
        expect(() => store.getItems(["test"])).toThrow("IndexedDBStorageDriver");
        expect(() => store.setItems({ test: "val" })).toThrow("IndexedDBStorageDriver");
        expect(() => store.remove("test")).toThrow("IndexedDBStorageDriver");
        expect(() => store.removeItems(["test"])).toThrow("IndexedDBStorageDriver");
        expect(() => store.clear()).toThrow("IndexedDBStorageDriver");
        expect(() => store.size()).toThrow("IndexedDBStorageDriver");
        expect(() => store.runGC()).toThrow("IndexedDBStorageDriver");
      });

      it("支持同前缀隔离的 StorageWrapper 跨实例 BroadcastChannel 联动同步与防抖去重", async () => {
        const storeA = createStorage("local", { prefix: "bc_", broadcast: true });
        const storeB = createStorage("local", { prefix: "bc_", broadcast: true });

        let bTriggerCount = 0;
        let bReceivedValue: any = null;

        storeB.onChange("msg", (val) => {
          bTriggerCount++;
          bReceivedValue = val;
        });

        // 实例 A 写入新数据
        storeA.set("msg", "hello_bc");

        // 等待 BroadcastChannel 异步广播到达 storeB
        await new Promise((resolve) => setTimeout(resolve, 10));

        expect(bReceivedValue).toBe("hello_bc");
        expect(bTriggerCount).toBe(1);
        // 检查 storeB 的内存缓存是否被联动同步更新了
        expect((storeB as any).cache.has("bc_msg")).toBe(true);

        // 再次写入相同的值，不应该触发 storeB 的回调（深度防抖去重）
        storeA.set("msg", "hello_bc");
        await new Promise((resolve) => setTimeout(resolve, 10));
        expect(bTriggerCount).toBe(1);

        // 实例 A 移除数据
        storeA.remove("msg");
        await new Promise((resolve) => setTimeout(resolve, 10));
        expect(bReceivedValue).toBeUndefined();
        expect(bTriggerCount).toBe(2);
        expect((storeB as any).cache.has("bc_msg")).toBe(false);

        // 实例 A 清空数据
        storeA.set("msg", "hello_bc_2");
        await new Promise((resolve) => setTimeout(resolve, 10));
        expect(bReceivedValue).toBe("hello_bc_2");

        storeA.clear();
        await new Promise((resolve) => setTimeout(resolve, 10));
        expect(bReceivedValue).toBeUndefined();
        expect((storeB as any).cache.has("bc_msg")).toBe(false);

        storeA.destroy();
        storeB.destroy();
      });

      it("支持 CustomStorageDriver 自定义适配驱动进行同步与异步存取，并根据环境特征进行安全校验", async () => {
        // 1. 测试同步自定义驱动
        const syncMap = new Map<string, string>();
        const syncCustomDriver = new CustomStorageDriver({
          getItem: (key) => syncMap.get(key) ?? null,
          setItem: (key, val) => { syncMap.set(key, val); },
          removeItem: (key) => { syncMap.delete(key); },
          keys: () => Array.from(syncMap.keys()),
        });

        const storeSync = createStorage(syncCustomDriver);
        storeSync.set("test_sync", "val");
        expect(storeSync.get("test_sync")).toBe("val");
        expect(storeSync.size()).toBe(1);

        // 2. 测试异步自定义驱动且未提供 keys 时，高级方法应安全拦截报错
        const asyncMap = new Map<string, string>();
        const asyncCustomDriver = new CustomStorageDriver({
          getItem: async (key) => asyncMap.get(key) ?? null,
          setItem: async (key, val) => { asyncMap.set(key, val); },
          removeItem: async (key) => { asyncMap.delete(key); },
        });

        const storeAsync = createStorage(asyncCustomDriver);
        await storeAsync.setAsync("test_async", "val_async");
        expect(await storeAsync.getAsync("test_async")).toBe("val_async");

        // 单键 size 不需要 keys 应该支持
        expect(await storeAsync.sizeAsync("test_async")).toBeGreaterThan(0);

        // 未实现 keys() 时进行 sizeAsync() 不带参数应该抛出友好错误
        await expect(storeAsync.sizeAsync()).rejects.toThrow("keys");
      });
    });
  });
});
