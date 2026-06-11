import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { setupTestEnv, cookieState, mockIndexedDBState } from "../helpers";
import {
  MemoryStorageDriver,
  WebStorageDriver,
  CookieStorageDriver,
  IndexedDBStorageDriver,
  CustomStorageDriver
} from "../../src/drivers";

beforeAll(() => {
  setupTestEnv();
});

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  cookieState.clear();
  mockIndexedDBState.clear();
});

describe("StorageDrivers 单元测试", () => {
  describe("MemoryStorageDriver", () => {
    it("基本 CRUD 功能应正常", () => {
      const driver = new MemoryStorageDriver();
      driver.setItem("test", "value");
      expect(driver.getItem("test")).toBe("value");
      expect(driver.hasItem("test")).toBe(true);

      driver.removeItem("test");
      expect(driver.getItem("test")).toBeNull();
      expect(driver.hasItem("test")).toBe(false);
    });

    it("批量操作与 keys() 接口", () => {
      const driver = new MemoryStorageDriver();
      driver.setItems({ a: "1", b: "2" });
      expect(driver.keys()).toEqual(["a", "b"]);

      const items = driver.getItems(["a", "b", "c"]);
      expect(items).toEqual({ a: "1", b: "2", c: null });

      driver.removeItems(["a"]);
      expect(driver.keys()).toEqual(["b"]);

      driver.clear();
      expect(driver.keys()).toEqual([]);
    });

    it("限制 maxItems 且进行 LRU 替换淘汰", () => {
      const driver = new MemoryStorageDriver({ maxItems: 3 });
      driver.setItem("a", "1");
      driver.setItem("b", "2");
      driver.setItem("c", "3");

      driver.getItem("a");
      driver.setItem("d", "4");

      expect(driver.hasItem("b")).toBe(false);
      expect(driver.hasItem("a")).toBe(true);
      expect(driver.hasItem("c")).toBe(true);
      expect(driver.hasItem("d")).toBe(true);
    });

    it("size() 方法重载应正常工作", () => {
      const driver = new MemoryStorageDriver();
      driver.setItem("a", "123");
      driver.setItem("b", "4567");

      // 1. 获取条目总数
      expect(driver.size()).toBe(2);

      // 2. 获取单个 value 大小
      expect(driver.size("a")).toBe(3);
      expect(driver.size("b")).toBe(4);

      // 3. 获取多个 values 大小 Record
      expect(driver.size(["a", "b", "c"])).toEqual({ a: 3, b: 4, c: 0 });
    });
  });

  describe("WebStorageDriver (LocalStorage / SessionStorage)", () => {
    it("应该能够代理到底层的 localStorage", () => {
      const driver = new WebStorageDriver("local");
      driver.setItem("local_key", "hello");
      expect(window.localStorage.getItem("local_key")).toBe("hello");
      expect(driver.getItem("local_key")).toBe("hello");

      driver.removeItem("local_key");
      expect(window.localStorage.getItem("local_key")).toBeNull();
    });

    it("应该能够代理到底层的 sessionStorage", () => {
      const driver = new WebStorageDriver("session");
      driver.setItem("session_key", "hello_sess");
      expect(window.sessionStorage.getItem("session_key")).toBe("hello_sess");
      expect(driver.getItem("session_key")).toBe("hello_sess");
    });

    it("批量操作与大小计算 (size)", () => {
      const driver = new WebStorageDriver("local");
      driver.setItems({ x: "12", y: "345" });
      
      expect(driver.size()).toBe(2);
      expect(driver.size("x")).toBe(2);
      expect(driver.size("y")).toBe(3);
      expect(driver.size(["x", "y", "z"])).toEqual({ x: 2, y: 3, z: 0 });
    });
  });

  describe("CookieStorageDriver", () => {
    it("基本 CRUD 操作及 cookie 格式解析", () => {
      const driver = new CookieStorageDriver();
      driver.setItem("user", "john");
      expect(cookieState.store).toContain("user=john");
      expect(driver.getItem("user")).toBe("john");

      driver.removeItem("user");
      expect(driver.getItem("user")).toBeNull();
    });

    it("批量操作与大小计算", () => {
      const driver = new CookieStorageDriver();
      driver.setItems({ token: "abc", age: "18" });
      expect(driver.getItem("token")).toBe("abc");
      expect(driver.getItem("age")).toBe("18");

      expect(driver.size()).toBe(2);
      expect(driver.size("token")).toBe(3);
      expect(driver.size(["token", "age", "none"])).toEqual({ token: 3, age: 2, none: 0 });
    });
  });

  describe("IndexedDBStorageDriver", () => {
    it("基本 CRUD 功能应正常", async () => {
      const driver = new IndexedDBStorageDriver("test_db", "test_store");
      await driver.setItem("test", "value");
      expect(await driver.getItem("test")).toBe("value");
      expect(await driver.hasItem("test")).toBe(true);

      await driver.removeItem("test");
      expect(await driver.getItem("test")).toBeNull();
      expect(await driver.hasItem("test")).toBe(false);
    });

    it("批量操作与 keys() 接口", async () => {
      const driver = new IndexedDBStorageDriver("test_db", "test_store");
      await driver.setItems({ a: "1", b: "2" });
      expect(await driver.keys()).toEqual(["a", "b"]);

      const items = await driver.getItems(["a", "b", "c"]);
      expect(items).toEqual({ a: "1", b: "2", c: null });

      await driver.removeItems(["a"]);
      expect(await driver.keys()).toEqual(["b"]);

      await driver.clear();
      expect(await driver.keys()).toEqual([]);
    });

    it("size() 方法重载与底层物理层监控接口", async () => {
      const driver = new IndexedDBStorageDriver("test_db2", "test_store2");
      await driver.clear();
      await driver.setItem("a", "123");
      await driver.setItem("b", "4567");

      expect(await driver.size()).toBe(2);
      expect(await driver.size("a")).toBe(3);
      expect(await driver.size("b")).toBe(4);
      expect(await driver.size(["a", "b", "c"])).toEqual({ a: 3, b: 4, c: 0 });

      expect(await driver.totalCount()).toBe(2);
      expect(await driver.totalSize()).toBe(7);
    });
  });
});
