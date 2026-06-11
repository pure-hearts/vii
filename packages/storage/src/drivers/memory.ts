import type { StorageDriver } from "../types";
import { DEFAULT_MAX_ITEMS } from "../constants";

/**
 * 纯内存实现的存储驱动，主要用于非浏览器环境（如 Node.js/SSR）下的平滑降级
 */
export class MemoryStorageDriver implements StorageDriver {
  private store = new Map<string, string>();
  private listeners = new Map<string, Set<(key: string, newValue: string | null) => void>>();
  private globalListeners = new Set<(key: string, newValue: string | null) => void>();
  private accessOrder: string[] = [];
  private maxItems: number;

  constructor(options: { maxItems?: number } = {}) {
    this.maxItems = options.maxItems || DEFAULT_MAX_ITEMS;
  }

  /**
   * 从内存中获取对应键的值
   * @param key 键名
   */
  getItem(key: string): string | null {
    const value = this.store.get(key) ?? null;
    if (value !== null) {
      const index = this.accessOrder.indexOf(key);
      if (index > -1) {
        this.accessOrder.splice(index, 1);
      }
      this.accessOrder.push(key);
    }
    return value;
  }

  /**
   * 将键值存入内存中并广播变更事件
   * @param key 键名
   * @param value 序列化后的字符串值
   */
  setItem(key: string, value: string, expireTime?: number | null, options?: any): void {
    const isNewKey = !this.store.has(key);
    if (isNewKey && this.store.size >= this.maxItems) {
      const oldestKey = this.accessOrder.shift();
      if (oldestKey) {
        this.store.delete(oldestKey);
        this.listeners.get(oldestKey)?.forEach((fn) => fn(oldestKey, null));
        this.globalListeners.forEach((fn) => fn(oldestKey, null));
      }
    }

    this.store.set(key, value);
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    this.accessOrder.push(key);

    this.listeners.get(key)?.forEach((fn) => fn(key, value));
    this.globalListeners.forEach((fn) => fn(key, value));
  }

  /**
   * 从内存中删除指定的键并广播变更事件
   * @param key 键名
   */
  removeItem(key: string): void {
    this.store.delete(key);
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    this.listeners.get(key)?.forEach((fn) => fn(key, null));
    this.globalListeners.forEach((fn) => fn(key, null));
  }

  /**
   * 检查内存中是否存在该键
   * @param key 键名
   */
  hasItem(key: string): boolean {
    return this.store.has(key);
  }

  /**
   * 清空内存中的所有存储
   */
  clear(): void {
    this.store.clear();
    this.accessOrder = [];
  }

  /**
   * 获取内存中存储的所有键名
   */
  keys(): string[] {
    return Array.from(this.store.keys());
  }

  /**
   * 批量获取内存中多个键对应的值
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
   * 批量将多个键值对写入内存中
   * @param pairs 键值对对象
   */
  setItems(pairs: Record<string, string>, expireTime?: number | null, options?: any): void {
    for (const [key, value] of Object.entries(pairs)) {
      this.setItem(key, value, expireTime, options);
    }
  }

  /**
   * 批量从内存中删除指定的键
   * @param keys 键名数组
   */
  removeItems(keys: string[]): void {
    for (const key of keys) {
      this.removeItem(key);
    }
  }

  /**
   * 获取大小
   * - 不传参：获取条目总数
   * - 传 string：获取单条数据序列化字符大小
   * - 传 string[]：获取批量数据大小映射
   * @param keyOrKeys 物理键名或物理键名数组
   */
  size(): number;
  size(key: string): number;
  size(keys: string[]): Record<string, number>;
  size(keyOrKeys?: string | string[]): number | Record<string, number> {
    if (keyOrKeys === undefined) {
      return this.store.size;
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
   * 订阅指定键（单个或多个）或全局数据变动事件
   * @param key 物理键名、键名数组或 null（当传入 null 时监听全局物理键变动）
   * @param callback 变更回调函数 (key, newValue)
   */
  subscribe(
    key: string | string[] | null,
    callback: (key: string, newValue: string | null) => void
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

  totalCount(): number {
    return this.store.size;
  }

  totalSize(): number {
    let size = 0;
    this.store.forEach((value) => {
      size += value.length;
    });
    return size;
  }
}
