import type { StorageDriver } from "../types";
import { DEFAULT_DB_NAME, DEFAULT_STORE_NAME } from "../constants";
import { HAS_INDEXEDDB } from "../utils";

/**
 * 全异步实现的 IndexedDB 存储驱动，主要用于大容量存储且不阻塞主线程
 */
export class IndexedDBStorageDriver implements StorageDriver {
  private dbName: string;
  private storeName: string;
  private dbPromise: Promise<IDBDatabase> | null = null;

  // 驱动层变动订阅管理（用于本实例/同进程驱动级别的同步联动）
  private listeners = new Map<string, Set<(key: string, newValue: string | null) => void>>();
  private globalListeners = new Set<(key: string, newValue: string | null) => void>();

  constructor(dbName = DEFAULT_DB_NAME, storeName = DEFAULT_STORE_NAME) {
    this.dbName = dbName;
    this.storeName = storeName;
    if (HAS_INDEXEDDB()) {
      this.dbPromise = this.initDB();
    }
  }

  /**
   * 初始化数据库及对象仓库
   */
  private initDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 获取对象存储仓库实例
   */
  private async getStore(mode: IDBTransactionMode): Promise<IDBObjectStore> {
    if (!this.dbPromise) {
      throw new Error("[IndexedDBStorageDriver] IndexedDB is not supported in this environment");
    }
    const db = await this.dbPromise;
    const transaction = db.transaction(this.storeName, mode);
    return transaction.objectStore(this.storeName);
  }

  async getItem(key: string): Promise<string | null> {
    const store = await this.getStore("readonly");
    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result !== undefined ? request.result : null);
      request.onerror = () => reject(request.error);
    });
  }

  async setItem(key: string, value: string): Promise<void> {
    const store = await this.getStore("readwrite");
    await new Promise<void>((resolve, reject) => {
      const request = store.put(value, key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    // 广播内部变动
    this.listeners.get(key)?.forEach((fn) => fn(key, value));
    this.globalListeners.forEach((fn) => fn(key, value));
  }

  async removeItem(key: string): Promise<void> {
    const store = await this.getStore("readwrite");
    await new Promise<void>((resolve, reject) => {
      const request = store.delete(key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    // 广播内部变动
    this.listeners.get(key)?.forEach((fn) => fn(key, null));
    this.globalListeners.forEach((fn) => fn(key, null));
  }

  async hasItem(key: string): Promise<boolean> {
    const store = await this.getStore("readonly");
    return new Promise((resolve, reject) => {
      const request = store.getKey(key);
      request.onsuccess = () => resolve(request.result !== undefined);
      request.onerror = () => reject(request.error);
    });
  }

  async clear(): Promise<void> {
    const store = await this.getStore("readwrite");
    return new Promise((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async keys(): Promise<string[]> {
    const store = await this.getStore("readonly");
    return new Promise((resolve, reject) => {
      const request = store.getAllKeys();
      request.onsuccess = () => resolve((request.result as string[]) || []);
      request.onerror = () => reject(request.error);
    });
  }

  async getItems(keys: string[]): Promise<Record<string, string | null>> {
    const store = await this.getStore("readonly");
    return new Promise((resolve, reject) => {
      const result: Record<string, string | null> = {};
      let completed = 0;
      if (keys.length === 0) {
        resolve(result);
        return;
      }
      keys.forEach((key) => {
        const req = store.get(key);
        req.onsuccess = () => {
          result[key] = req.result !== undefined ? req.result : null;
          completed++;
          if (completed === keys.length) {
            resolve(result);
          }
        };
        req.onerror = () => reject(req.error);
      });
    });
  }

  async setItems(pairs: Record<string, string>): Promise<void> {
    if (!this.dbPromise) {
      throw new Error("[IndexedDBStorageDriver] IndexedDB is not supported in this environment");
    }
    const db = await this.dbPromise;
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(this.storeName, "readwrite");
      const store = transaction.objectStore(this.storeName);

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);

      for (const [key, value] of Object.entries(pairs)) {
        store.put(value, key);
      }
    });

    Object.entries(pairs).forEach(([key, value]) => {
      this.listeners.get(key)?.forEach((fn) => fn(key, value));
      this.globalListeners.forEach((fn) => fn(key, value));
    });
  }

  async removeItems(keys: string[]): Promise<void> {
    if (!this.dbPromise) {
      throw new Error("[IndexedDBStorageDriver] IndexedDB is not supported in this environment");
    }
    const db = await this.dbPromise;
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(this.storeName, "readwrite");
      const store = transaction.objectStore(this.storeName);

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);

      for (const key of keys) {
        store.delete(key);
      }
    });

    keys.forEach((key) => {
      this.listeners.get(key)?.forEach((fn) => fn(key, null));
      this.globalListeners.forEach((fn) => fn(key, null));
    });
  }

  size(): Promise<number>;
  size(key: string): Promise<number>;
  size(keys: string[]): Promise<Record<string, number>>;
  async size(keyOrKeys?: string | string[]): Promise<number | Record<string, number>> {
    if (keyOrKeys === undefined) {
      const store = await this.getStore("readonly");
      return new Promise((resolve, reject) => {
        const request = store.count();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }

    if (Array.isArray(keyOrKeys)) {
      const items = await this.getItems(keyOrKeys);
      const sizes: Record<string, number> = {};
      for (const [k, v] of Object.entries(items)) {
        sizes[k] = v ? v.length : 0;
      }
      return sizes;
    }

    const val = await this.getItem(keyOrKeys);
    return val ? val.length : 0;
  }

  subscribe(
    key: string | string[] | null,
    callback: (key: string, newValue: string | null) => void,
  ): () => void {
    if (key === null) {
      this.globalListeners.add(callback);
      return () => {
        this.globalListeners.delete(callback);
      };
    }

    const targetKeys = Array.isArray(key) ? key : [key];
    targetKeys.forEach((k) => {
      if (!this.listeners.has(k)) {
        this.listeners.set(k, new Set());
      }
      this.listeners.get(k)!.add(callback);
    });

    return () => {
      targetKeys.forEach((k) => {
        const set = this.listeners.get(k);
        if (set) {
          set.delete(callback);
          if (set.size === 0) {
            this.listeners.delete(k);
          }
        }
      });
    };
  }

  async totalCount(): Promise<number> {
    return this.size();
  }

  async totalSize(): Promise<number> {
    const allKeys = await this.keys();
    const items = await this.getItems(allKeys);
    let size = 0;
    Object.values(items).forEach((val) => {
      if (val) size += val.length;
    });
    return size;
  }
}
