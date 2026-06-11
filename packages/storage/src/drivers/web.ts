import type { StorageDriver } from "../types";
import { IS_BROWSER } from "../utils";

/**
 * LocalStorage / SessionStorage 浏览器原生 Web 存储驱动
 */
export class WebStorageDriver implements StorageDriver {
  private storage: Storage | null = null;

  constructor(type: "local" | "session") {
    if (IS_BROWSER()) {
      this.storage = type === "local" ? window.localStorage : window.sessionStorage;
    }
  }

  /**
   * 从 LocalStorage/SessionStorage 获取对应键的值
   * @param key 键名
   */
  getItem(key: string): string | null {
    return this.storage ? this.storage.getItem(key) : null;
  }

  /**
   * 向 LocalStorage/SessionStorage 写入对应键的值
   * @param key 键名
   * @param value 序列化后的字符串值
   */
  setItem(key: string, value: string, expireTime?: number | null, options?: any): void {
    this.storage?.setItem(key, value);
  }

  /**
   * 从 LocalStorage/SessionStorage 删除对应键的值
   * @param key 键名
   */
  removeItem(key: string): void {
    this.storage?.removeItem(key);
  }

  /**
   * 检查 LocalStorage/SessionStorage 中是否存在该键
   * @param key 键名
   */
  hasItem(key: string): boolean {
    return this.storage ? this.storage.getItem(key) !== null : false;
  }

  /**
   * 清空 LocalStorage/SessionStorage 的所有物理存储
   */
  clear(): void {
    this.storage?.clear();
  }

  /**
   * 获取 LocalStorage/SessionStorage 中当前存在的所有键名
   */
  keys(): string[] {
    if (!this.storage) return [];
    const keysList: string[] = [];
    for (let i = 0; i < this.storage.length; i++) {
      const k = this.storage.key(i);
      if (k) keysList.push(k);
    }
    return keysList;
  }

  /**
   * 批量从 LocalStorage/SessionStorage 获取多个键的值
   * @param keys 键名数组
   */
  getItems(keys: string[]): Record<string, string | null> {
    const result: Record<string, string | null> = {};
    for (const key of keys) {
      result[key] = this.getItem(key);
    }
    return result;
  }

  /**
   * 批量向 LocalStorage/SessionStorage 写入多个键的值
   * @param pairs 键值对对象
   */
  setItems(pairs: Record<string, string>, expireTime?: number | null, options?: any): void {
    for (const [key, value] of Object.entries(pairs)) {
      this.setItem(key, value, expireTime, options);
    }
  }

  /**
   * 批量从 LocalStorage/SessionStorage 删除多个键的值
   * @param keys 键名数组
   */
  removeItems(keys: string[]): void {
    for (const key of keys) {
      this.removeItem(key);
    }
  }

  /**
   * 获取大小
   * - 不传参：获取物理条目总数
   * - 传 string：获取单条数据序列化字符大小
   * - 传 string[]：获取批量数据大小映射
   * @param keyOrKeys 物理键名或物理键名数组
   */
  size(): number;
  size(key: string): number;
  size(keys: string[]): Record<string, number>;
  size(keyOrKeys?: string | string[]): number | Record<string, number> {
    if (keyOrKeys === undefined) {
      return this.storage ? this.storage.length : 0;
    }
    if (Array.isArray(keyOrKeys)) {
      const sizes: Record<string, number> = {};
      for (const k of keyOrKeys) {
        sizes[k] = (this.getItem(k) ?? "").length;
      }
      return sizes;
    }
    return (this.getItem(keyOrKeys) ?? "").length;
  }

  /**
   * 订阅浏览器原生 storage 事件变化
   * @param key 物理键名、键名数组或 null（当传入 null 时监听全局物理键变动）
   * @param callback 发生变动时的回调 (key, newValue)
   */
  subscribe(
    key: string | string[] | null,
    callback: (key: string, newValue: string | null) => void,
  ): () => void {
    if (!IS_BROWSER() || !this.storage) return () => {};

    const handler = (event: StorageEvent) => {
      if (event.storageArea !== this.storage || !event.key) return;

      const isMatch =
        key === null ||
        (typeof key === "string" && event.key === key) ||
        (Array.isArray(key) && key.includes(event.key));

      if (isMatch) {
        callback(event.key, event.newValue);
      }
    };

    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("storage", handler);
    };
  }

  totalCount(): number {
    return this.storage ? this.storage.length : 0;
  }

  totalSize(): number {
    if (!this.storage) return 0;
    let size = 0;
    for (let i = 0; i < this.storage.length; i++) {
      const key = this.storage.key(i);
      if (key) {
        size += (this.storage.getItem(key) ?? "").length;
      }
    }
    return size;
  }
}
