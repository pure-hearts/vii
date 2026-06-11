import type { StorageDriver } from "../types";

export interface CustomDriverOptions {
  getItem: (key: string) => string | null | Promise<string | null>;
  setItem: (key: string, value: string, expireTime?: number | null) => void | Promise<void>;
  removeItem: (key: string) => void | Promise<void>;
  clear?: () => void | Promise<void>;
  keys?: () => string[] | Promise<string[]>;
  hasItem?: (key: string) => boolean | Promise<boolean>;
  subscribe?: (
    key: string | string[] | null,
    callback: (key: string, newValue: string | null) => void
  ) => () => void;
}

/**
 * 通用自定义适配驱动，用户只需传入 getItem/setItem/removeItem 即可完美适配任何第三方平台环境
 */
export class CustomStorageDriver implements StorageDriver {
  private opts: CustomDriverOptions;
  private listeners = new Map<string, Set<(key: string, newValue: string | null) => void>>();
  private globalListeners = new Set<(key: string, newValue: string | null) => void>();

  constructor(options: CustomDriverOptions) {
    if (!options.getItem || !options.setItem || !options.removeItem) {
      throw new Error("[CustomStorageDriver] getItem, setItem, and removeItem are required methods.");
    }
    this.opts = options;
  }

  getItem(key: string): string | null | Promise<string | null> {
    return this.opts.getItem(key);
  }

  setItem(key: string, value: string, expireTime?: number | null): void | Promise<void> {
    const res = this.opts.setItem(key, value, expireTime);
    if (res instanceof Promise) {
      return res.then(() => {
        this.notify(key, value);
      });
    }
    this.notify(key, value);
  }

  removeItem(key: string): void | Promise<void> {
    const res = this.opts.removeItem(key);
    if (res instanceof Promise) {
      return res.then(() => {
        this.notify(key, null);
      });
    }
    this.notify(key, null);
  }

  hasItem(key: string): boolean | Promise<boolean> {
    if (this.opts.hasItem) {
      return this.opts.hasItem(key);
    }
    const val = this.getItem(key);
    if (val instanceof Promise) {
      return val.then((v) => v !== null);
    }
    return val !== null;
  }

  clear(): void | Promise<void> {
    if (this.opts.clear) {
      return this.opts.clear();
    }
    const keysVal = this.keys();
    if (keysVal instanceof Promise) {
      return keysVal.then((allKeys) => {
        const promises = allKeys.map((k) => this.removeItem(k));
        const hasPromise = promises.some((p) => p instanceof Promise);
        if (hasPromise) {
          return Promise.all(promises) as any;
        }
      });
    }
    const promises = keysVal.map((k) => this.removeItem(k));
    const hasPromise = promises.some((p) => p instanceof Promise);
    if (hasPromise) {
      return Promise.all(promises) as any;
    }
  }

  keys(): string[] | Promise<string[]> {
    if (this.opts.keys) {
      return this.opts.keys();
    }
    throw new Error("[CustomStorageDriver] 'keys' method is not implemented by the custom driver config. Iterative operations are not supported.");
  }

  getItems(keys: string[]): Record<string, string | null> | Promise<Record<string, string | null>> {
    const results: Record<string, string | null> = {};
    const promises: Promise<void>[] = [];

    for (const key of keys) {
      const val = this.getItem(key);
      if (val instanceof Promise) {
        promises.push(val.then((v) => { results[key] = v; }));
      } else {
        results[key] = val;
      }
    }

    if (promises.length > 0) {
      return Promise.all(promises).then(() => results);
    }
    return results;
  }

  setItems(pairs: Record<string, string>, expireTime?: number | null): void | Promise<void> {
    const promises: Promise<void>[] = [];
    for (const [key, value] of Object.entries(pairs)) {
      const res = this.setItem(key, value, expireTime);
      if (res instanceof Promise) {
        promises.push(res);
      }
    }
    if (promises.length > 0) {
      return Promise.all(promises) as any;
    }
  }

  removeItems(keys: string[]): void | Promise<void> {
    const promises: Promise<void>[] = [];
    for (const key of keys) {
      const res = this.removeItem(key);
      if (res instanceof Promise) {
        promises.push(res);
      }
    }
    if (promises.length > 0) {
      return Promise.all(promises) as any;
    }
  }

  size(): number | Promise<number>;
  size(key: string): number | Promise<number>;
  size(keys: string[]): Record<string, number> | Promise<Record<string, number>>;
  size(keyOrKeys?: string | string[]): number | Record<string, number> | Promise<number | Record<string, number>> {
    if (keyOrKeys === undefined) {
      const keysVal = this.keys();
      if (keysVal instanceof Promise) {
        return keysVal.then((allKeys) => allKeys.length);
      }
      return keysVal.length;
    }

    if (Array.isArray(keyOrKeys)) {
      const itemsVal = this.getItems(keyOrKeys);
      if (itemsVal instanceof Promise) {
        return itemsVal.then((items) => {
          const sizes: Record<string, number> = {};
          for (const [k, v] of Object.entries(items)) {
            sizes[k] = v ? v.length : 0;
          }
          return sizes;
        });
      }
      const sizes: Record<string, number> = {};
      for (const [k, v] of Object.entries(itemsVal)) {
        sizes[k] = v ? v.length : 0;
      }
      return sizes;
    }

    const val = this.getItem(keyOrKeys);
    if (val instanceof Promise) {
      return val.then((v) => (v ? v.length : 0));
    }
    return val ? val.length : 0;
  }

  subscribe(
    key: string | string[] | null,
    callback: (key: string, newValue: string | null) => void
  ): () => void {
    if (this.opts.subscribe) {
      return this.opts.subscribe(key, callback);
    }

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

  totalCount(): number | Promise<number> {
    return this.size();
  }

  totalSize(): number | Promise<number> {
    const keysVal = this.keys();
    if (keysVal instanceof Promise) {
      return keysVal.then((allKeys) => {
        const itemsVal = this.getItems(allKeys);
        if (itemsVal instanceof Promise) {
          return itemsVal.then((items) => {
            let total = 0;
            Object.values(items).forEach((v) => {
              if (v) total += v.length;
            });
            return total;
          });
        }
        let total = 0;
        Object.values(itemsVal).forEach((v) => {
          if (v) total += v.length;
        });
        return total;
      });
    }

    const itemsVal = this.getItems(keysVal);
    if (itemsVal instanceof Promise) {
      return itemsVal.then((items) => {
        let total = 0;
        Object.values(items).forEach((v) => {
          if (v) total += v.length;
        });
        return total;
      });
    }
    let total = 0;
    Object.values(itemsVal).forEach((v) => {
      if (v) total += v.length;
    });
    return total;
  }

  private notify(key: string, newValue: string | null): void {
    this.listeners.get(key)?.forEach((fn) => fn(key, newValue));
    this.globalListeners.forEach((fn) => fn(key, newValue));
  }
}
