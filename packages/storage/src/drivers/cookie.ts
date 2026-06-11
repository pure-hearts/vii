import type { StorageDriver, CookieOptions } from "../types";
import { HAS_DOCUMENT } from "../utils";

/**
 * 浏览器 Cookie 存储驱动
 */
export class CookieStorageDriver implements StorageDriver {
  /**
   * 从 document.cookie 中解析并获取特定的 key 值
   * @param key 键名
   */
  getItem(key: string): string | null {
    if (!HAS_DOCUMENT()) return null;
    const prefix = `${encodeURIComponent(key)}=`;
    const cookies = document.cookie.split(";");
    for (let cookie of cookies) {
      cookie = cookie.trim();
      if (cookie.startsWith(prefix)) {
        return decodeURIComponent(cookie.slice(prefix.length));
      }
    }
    return null;
  }

  /**
   * 向 document.cookie 中写入键值，并设置相应的过期时间和属性
   * @param key 键名
   * @param value 序列化后的字符串值
   * @param expireTime 过期的绝对毫秒时间戳
   * @param options Cookie 额外属性
   */
  setItem(key: string, value: string, expireTime: number | null = null, options?: CookieOptions): void {
    if (!HAS_DOCUMENT()) return;
    let expiresStr = "";
    if (expireTime !== null) {
      expiresStr = `; expires=${new Date(expireTime).toUTCString()}`;
    }
    const path = options?.path || "/";
    const domain = options?.domain ? `; domain=${options.domain}` : "";
    const secure = options?.secure ? "; secure" : "";
    const sameSite = options?.sameSite ? `; SameSite=${options.sameSite}` : "; SameSite=Lax";

    document.cookie = `${encodeURIComponent(key)}=${encodeURIComponent(value)}${expiresStr}; path=${path}${domain}${sameSite}${secure}`;
  }

  /**
   * 移除 Cookie（通过设置 expires 为 1970 历史时间）
   * @param key 键名
   * @param options Cookie 额外属性
   */
  removeItem(key: string, options?: CookieOptions): void {
    if (!HAS_DOCUMENT()) return;
    const path = options?.path || "/";
    const domain = options?.domain ? `; domain=${options.domain}` : "";
    document.cookie = `${encodeURIComponent(key)}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path}${domain}; SameSite=Lax`;
  }

  /**
   * 检查 Cookie 中是否存在该键
   * @param key 键名
   */
  hasItem(key: string): boolean {
    return this.getItem(key) !== null;
  }

  /**
   * 通过删除所有存在的 Cookie 键名来重置/清空 Cookie 存储
   * @param options Cookie 额外属性
   */
  clear(options?: CookieOptions): void {
    if (!HAS_DOCUMENT()) return;
    this.keys().forEach((key) => {
      this.removeItem(key, options);
    });
  }

  /**
   * 解析 document.cookie 并返回所有存在的 key 数组
   */
  keys(): string[] {
    if (!HAS_DOCUMENT()) return [];
    return document.cookie
      .split(";")
      .map((c) => decodeURIComponent(c.split("=")[0].trim()))
      .filter(Boolean);
  }

  /**
   * 批量从 Cookie 中解析获取多个键的值
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
   * 批量向 Cookie 中写入多个键值对
   * @param pairs 键值对对象
   * @param expireTime 过期的绝对毫秒时间戳
   * @param options Cookie 额外属性
   */
  setItems(pairs: Record<string, string>, expireTime: number | null = null, options?: CookieOptions): void {
    for (const [key, value] of Object.entries(pairs)) {
      this.setItem(key, value, expireTime, options);
    }
  }

  /**
   * 批量从 Cookie 中移除多个键
   * @param keys 键名数组
   * @param options Cookie 额外属性
   */
  removeItems(keys: string[], options?: CookieOptions): void {
    for (const key of keys) {
      this.removeItem(key, options);
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
      return this.keys().length;
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
   * 订阅 Cookie 的变化（Cookie 无原生的非轮询事件分发，此处返回空解绑函数以作 Null 占位）
   */
  subscribe(): () => void {
    return () => {};
  }

  totalCount(): number {
    return this.keys().length;
  }

  totalSize(): number {
    if (!HAS_DOCUMENT()) return 0;
    let size = 0;
    this.keys().forEach((key) => {
      size += (this.getItem(key) ?? "").length;
    });
    return size;
  }
}
