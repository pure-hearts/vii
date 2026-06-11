import type { CookieOptions, Serializer, StorageOptions, StorageData, StorageDriver, StorageInterceptor, StorageInterceptorContext } from "./types";
import { MemoryStorageDriver } from "./drivers/memory";
import { WebStorageDriver } from "./drivers/web";
import { getValueByPath, defaultSerializer, isEqual, generateHash, IS_BROWSER, HAS_BROADCAST_CHANNEL, HAS_REQUEST_IDLE_CALLBACK } from "./utils";
import { DEFAULT_SECRET_SALT, DEFAULT_BROADCAST_CHANNEL } from "./constants";

export { getValueByPath };

/**
 * 多引擎存储包装器
 */
export class StorageWrapper<T extends Record<string, any> = Record<string, any>> {
  private driver: StorageDriver;
  private prefix: string;
  private suffix: string;
  private defaultExpire: number | null;
  private serializer: Serializer;
  private defaultCookieOptions?: CookieOptions;
  
  // 订阅管理
  private listeners = new Map<string, Set<any>>();
  private activeSubscriptions = new Map<string, () => void>();

  // 拦截器、GC 扫描与配额超限配置
  private interceptors: StorageInterceptor[] = [];
  private gcInterval: number | null = null;
  private gcTimer: any = null;
  private onQuotaExceeded?: (err: Error, context: { key: string; value: any }) => void;

  // 内存缓存、防篡改校验与深度值监听对比
  private cache = new Map<string, StorageData>();
  private integrity: boolean;
  private secretSalt: string;
  private lastSeenValues = new Map<string, any>();

  // 跨实例 BroadcastChannel 实时同步通信与唯一标识
  private broadcastChannel: any = null;
  private instanceId: string;

  constructor(type: "local" | "session" | StorageDriver, options: StorageOptions = {}) {
    this.prefix = options.prefix || "";
    this.suffix = options.suffix || "";
    this.defaultExpire = options.expire !== undefined ? options.expire : null;
    this.serializer = options.serializer || defaultSerializer;
    this.defaultCookieOptions = options.cookieOptions;

    // 拦截器、GC 与数据完整性校验初始化
    this.interceptors = options.interceptors || [];
    this.gcInterval = options.gcInterval || null;
    this.onQuotaExceeded = options.onQuotaExceeded;
    this.integrity = options.integrity || false;
    this.secretSalt = options.secretSalt || DEFAULT_SECRET_SALT;

    // 唯一实例 ID 标识
    this.instanceId = generateHash(Math.random().toString() + Date.now().toString());

    if (typeof type === "string") {
      const isBrowser = IS_BROWSER();
      this.driver = !isBrowser
        ? new MemoryStorageDriver()
        : new WebStorageDriver(type);
    } else {
      this.driver = type;
    }

    // 初始化定时 GC 扫描
    if (this.gcInterval && this.gcInterval > 0) {
      this.initGCTimer();
    }

    // 初始化跨实例 BroadcastChannel 监听通信（仅在浏览器环境下启用）
    const enableBroadcast = options.broadcast !== false;
    if (enableBroadcast && HAS_BROADCAST_CHANNEL()) {
      try {
        this.broadcastChannel = new BroadcastChannel(DEFAULT_BROADCAST_CHANNEL);
        this.initBroadcastListener();
      } catch {
        // 忽略可能的环境隔离沙箱限制
      }
    }
  }

  /**
   * 初始化跨实例广播接收监听
   */
  private initBroadcastListener(): void {
    if (!this.broadcastChannel) return;
    this.broadcastChannel.onmessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data || data.instanceId === this.instanceId) return; // 忽略自己实例发送的变动

      const { type, key, keys, value } = data;

      if (type === "set" && key) {
        const fullKey = this.getFullKey(key);
        let parsedValue: any = undefined;
        let dataNode: StorageData | null = null;

        if (value !== null) {
          try {
            const sData: StorageData = this.serializer.deserialize(value);
            // 完整性指纹校验
            if (this.integrity) {
              const expectedSig = generateHash(JSON.stringify(sData.value) + this.secretSalt);
              if (!sData.signature || sData.signature !== expectedSig) {
                return; // 签名冲突，直接静默
              }
            }
            dataNode = sData;
            parsedValue = sData.value;
          } catch {
            parsedValue = value;
            dataNode = { value, expire: null };
          }
        }

        // 双向同步更新本地内存缓存层
        if (dataNode) {
          this.cache.set(fullKey, dataNode);
        } else {
          this.cache.delete(fullKey);
        }

        // 深度防抖去重后，触发当前实例上绑定的 onChange 回调
        this.triggerLocalListeners(key, parsedValue);
      } else if (type === "remove") {
        if (key) {
          const fullKey = this.getFullKey(key);
          this.cache.delete(fullKey);
          this.triggerLocalListeners(key, undefined);
        }
        if (keys && Array.isArray(keys)) {
          keys.forEach((k) => {
            const fullKey = this.getFullKey(k);
            this.cache.delete(fullKey);
            this.triggerLocalListeners(k, undefined);
          });
        }
      } else if (type === "clear") {
        this.cache.forEach((_, fullKey) => {
          if (this.matchKey(fullKey)) {
            this.cache.delete(fullKey);
            const rawKey = this.getRawKey(fullKey);
            this.triggerLocalListeners(rawKey, undefined);
          }
        });
      }
    };
  }

  /**
   * 触发本包装器实例内部绑定的 onChange 监听，且进行深度防抖比对
   */
  private triggerLocalListeners(key: string, newValue: any): void {
    this.listeners.forEach((handlers, subKey) => {
      const isArray = subKey.startsWith("[batch]:");
      const keys = isArray ? subKey.slice("[batch]:".length).split(",") : [subKey];

      if (keys.includes(key)) {
        const lastSeen = this.lastSeenValues.get(subKey);
        let broadcastValue: any;

        if (isArray) {
          // 重新抓取包含所有 Key 最新值的聚合 Record 字典
          broadcastValue = this.getItems(keys);
        } else {
          broadcastValue = newValue;
        }

        if (isEqual(lastSeen, broadcastValue)) {
          return; // 深度值一致则防抖去重
        }
        this.lastSeenValues.set(subKey, broadcastValue);

        handlers.forEach((fn) => {
          if (isArray) {
            fn(key, newValue);
          } else {
            fn(newValue);
          }
        });
      }
    });
  }

  /**
   * 内部方法：向全局广播变动以完成多实例与跨页面状态一致同步
   */
  private sendBroadcast(type: "set" | "remove" | "clear", payload?: { key?: string; keys?: string[]; value?: string | null }): void {
    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({
        instanceId: this.instanceId,
        type,
        ...payload,
      });
    }
  }

  /**
   * 校验底层是否为异步驱动，若是，强行拦截同步调用并抛出友好异常提示
   */
  private checkAsyncDriverConflict(opName: string): void {
    if (this.driver.constructor && this.driver.constructor.name === "IndexedDBStorageDriver") {
      throw new Error(`[StorageWrapper] Synchronous operation "${opName}" is not supported on Asynchronous Driver "IndexedDBStorageDriver". Please use the async version "${opName}Async" instead.`);
    }
  }

  /**
   * 初始化 GC 周期定时器
   */
  private initGCTimer(): void {
    this.gcTimer = setInterval(() => {
      if (HAS_REQUEST_IDLE_CALLBACK()) {
        (window as any).requestIdleCallback(() => this.runGC());
      } else {
        this.runGC();
      }
    }, this.gcInterval!);
  }

  /**
   * 同步垃圾回收：扫描并清除当前命名空间下所有已过期的物理键值
   */
  runGC(): void {
    this.checkAsyncDriverConflict("runGC");
    const now = Date.now();
    const allKeys = this.driver.keys() as string[];
    allKeys.forEach((fullKey) => {
      if (this.matchKey(fullKey)) {
        const serialized = this.driver.getItem(fullKey) as string | null;
        if (serialized !== null) {
          try {
            const data: StorageData = this.serializer.deserialize(serialized);
            if (data && data.expire !== null && data.expire < now) {
              this.driver.removeItem(fullKey, this.defaultCookieOptions);
              this.cache.delete(fullKey);
            }
          } catch {
            // 忽略非包装格式的数据
          }
        }
      }
    });
  }

  /**
   * 异步垃圾回收：支持异步驱动底座下的过期残留扫描与清除
   */
  async runGCAsync(): Promise<void> {
    const now = Date.now();
    const allKeys = await this.driver.keys();
    for (const fullKey of allKeys) {
      if (this.matchKey(fullKey)) {
        const serialized = await this.driver.getItem(fullKey);
        if (serialized !== null) {
          try {
            const data: StorageData = this.serializer.deserialize(serialized);
            if (data && data.expire !== null && data.expire < now) {
              await this.driver.removeItem(fullKey, this.defaultCookieOptions);
              this.cache.delete(fullKey);
            }
          } catch {
            // 忽略非包装数据
          }
        }
      }
    }
  }

  /**
   * 判断错误是否为物理存储配额已满
   */
  private isQuotaExceededError(err: any): boolean {
    if (!err) return false;
    const name = err.name || "";
    const code = err.code;
    return (
      name === "QuotaExceededError" ||
      name === "NS_ERROR_DOM_QUOTA_REACHED" ||
      code === 22 ||
      code === 1014 ||
      /quota/i.test(name) ||
      /quota/i.test(err.message || "")
    );
  }

  /**
   * 根据 prefix 和 suffix 拼接完整的存储键名
   */
  private getFullKey(key: string): string {
    return `${this.prefix}${key}${this.suffix}`;
  }

  /**
   * 还原去除了 prefix 和 suffix 的原始逻辑键名
   */
  private getRawKey(fullKey: string): string {
    let key = fullKey;
    if (this.prefix && key.startsWith(this.prefix)) {
      key = key.slice(this.prefix.length);
    }
    if (this.suffix && key.endsWith(this.suffix)) {
      key = key.slice(0, -this.suffix.length);
    }
    return key;
  }

  /**
   * 同步获取并统一处理存储的数据，支持自动反序列化、内存缓存、过期主动清理与防篡改指纹校验
   */
  private getStoredData(key: string): StorageData | null {
    this.checkAsyncDriverConflict("get");
    // 1. 优先读缓存层，防止 I/O 穿透和反序列化损耗
    if (this.cache.has(key)) {
      const cached = this.cache.get(key)!;
      if (cached.expire !== null && cached.expire < Date.now()) {
        this.cache.delete(key);
        this.driver.removeItem(key, this.defaultCookieOptions);
        return null;
      }
      return cached;
    }

    // 2. 缓存未命中，读物理介质
    const serialized = this.driver.getItem(key) as string | null;
    if (serialized === null) return null;
    try {
      const data: StorageData = this.serializer.deserialize(serialized);
      
      // 3. 校验时效性
      if (data && data.expire !== null && data.expire < Date.now()) {
        this.driver.removeItem(key, this.defaultCookieOptions);
        return null;
      }

      // 4. 校验防篡改指纹完整性
      if (this.integrity) {
        const expectedSig = generateHash(JSON.stringify(data.value) + this.secretSalt);
        if (!data.signature || data.signature !== expectedSig) {
          console.warn(`[StorageWrapper] Data integrity check failed for key "${key}". Evicting tampered data.`);
          this.driver.removeItem(key, this.defaultCookieOptions);
          this.cache.delete(key);
          return null;
        }
      }

      // 5. 写入缓存并返回
      this.cache.set(key, data);
      return data;
    } catch {
      // 兜底：处理非包装结构的原生数据
      const rawData = { value: serialized, expire: null };
      this.cache.set(key, rawData);
      return rawData;
    }
  }

  /**
   * 异步获取并统一处理存储的数据（带 Promise 返回，并支持内存缓存秒级命中）
   */
  private async getStoredDataAsync(key: string): Promise<StorageData | null> {
    // 1. 内存缓存层命中
    if (this.cache.has(key)) {
      const cached = this.cache.get(key)!;
      if (cached.expire !== null && cached.expire < Date.now()) {
        this.cache.delete(key);
        await this.driver.removeItem(key, this.defaultCookieOptions);
        return null;
      }
      return cached;
    }

    // 2. 未命中，await 异步读取
    const serialized = await this.driver.getItem(key);
    if (serialized === null) return null;
    try {
      const data: StorageData = this.serializer.deserialize(serialized);
      
      if (data && data.expire !== null && data.expire < Date.now()) {
        await this.driver.removeItem(key, this.defaultCookieOptions);
        return null;
      }

      if (this.integrity) {
        const expectedSig = generateHash(JSON.stringify(data.value) + this.secretSalt);
        if (!data.signature || data.signature !== expectedSig) {
          console.warn(`[StorageWrapper] Data integrity check failed for key "${key}". Evicting tampered data.`);
          await this.driver.removeItem(key, this.defaultCookieOptions);
          this.cache.delete(key);
          return null;
        }
      }

      this.cache.set(key, data);
      return data;
    } catch {
      const rawData = { value: serialized, expire: null };
      this.cache.set(key, rawData);
      return rawData;
    }
  }

  /**
   * 内部物理级同步写入流程（包含拦截器前置运行、防篡改签名运算、写直达缓存维护、配额写满自动 GC 重试）
   */
  private setRaw<K extends keyof T & string>(
    key: K,
    value: T[K],
    expire?: number | null,
    options?: CookieOptions,
  ): void {
    this.checkAsyncDriverConflict("set");
    let ctx: StorageInterceptorContext = {
      key,
      value,
      expire: expire === undefined ? this.defaultExpire : expire,
      options: { ...this.defaultCookieOptions, ...options },
    };

    // 运行 beforeSet 拦截链
    for (const interceptor of this.interceptors) {
      if (interceptor.beforeSet) {
        const nextCtx = interceptor.beforeSet(ctx);
        if (nextCtx === false) {
          return; // 中止写入
        }
        if (nextCtx) {
          ctx = nextCtx;
        }
      }
    }

    const fullKey = this.getFullKey(ctx.key);
    const ctxExpire = ctx.expire;
    const expireTime = ctxExpire !== undefined && ctxExpire !== null && ctxExpire > 0 ? Date.now() + ctxExpire : null;
    
    // 构建存储对象，如果开启了 integrity，打上哈希签名指纹
    const data: StorageData = {
      value: ctx.value,
      expire: expireTime,
    };
    if (this.integrity) {
      data.signature = generateHash(JSON.stringify(ctx.value) + this.secretSalt);
    }

    const serialized = this.serializer.serialize(data);

    try {
      this.driver.setItem(fullKey, serialized, expireTime, ctx.options);
      this.cache.set(fullKey, data);
      this.sendBroadcast("set", { key: ctx.key, value: serialized });
    } catch (err: any) {
      if (this.isQuotaExceededError(err)) {
        this.runGC();
        try {
          this.driver.setItem(fullKey, serialized, expireTime, ctx.options);
          this.cache.set(fullKey, data);
          this.sendBroadcast("set", { key: ctx.key, value: serialized });
        } catch (retryErr: any) {
          throw retryErr;
        }
      } else {
        throw err;
      }
    }

    // 运行 afterSet 拦截链
    for (const interceptor of this.interceptors) {
      if (interceptor.afterSet) {
        interceptor.afterSet(ctx);
      }
    }
  }

  /**
   * 内部物理级异步写入流程（支持异步驱动与 Async API 链）
   */
  private async setRawAsync<K extends keyof T & string>(
    key: K,
    value: T[K],
    expire?: number | null,
    options?: CookieOptions,
  ): Promise<void> {
    let ctx: StorageInterceptorContext = {
      key,
      value,
      expire: expire === undefined ? this.defaultExpire : expire,
      options: { ...this.defaultCookieOptions, ...options },
    };

    for (const interceptor of this.interceptors) {
      if (interceptor.beforeSet) {
        const nextCtx = interceptor.beforeSet(ctx);
        if (nextCtx === false) {
          return;
        }
        if (nextCtx) {
          ctx = nextCtx;
        }
      }
    }

    const fullKey = this.getFullKey(ctx.key);
    const ctxExpire = ctx.expire;
    const expireTime = ctxExpire !== undefined && ctxExpire !== null && ctxExpire > 0 ? Date.now() + ctxExpire : null;
    
    const data: StorageData = {
      value: ctx.value,
      expire: expireTime,
    };
    if (this.integrity) {
      data.signature = generateHash(JSON.stringify(ctx.value) + this.secretSalt);
    }

    const serialized = this.serializer.serialize(data);

    try {
      await this.driver.setItem(fullKey, serialized, expireTime, ctx.options);
      this.cache.set(fullKey, data);
      this.sendBroadcast("set", { key: ctx.key, value: serialized });
    } catch (err: any) {
      if (this.isQuotaExceededError(err)) {
        await this.runGCAsync();
        try {
          await this.driver.setItem(fullKey, serialized, expireTime, ctx.options);
          this.cache.set(fullKey, data);
          this.sendBroadcast("set", { key: ctx.key, value: serialized });
        } catch (retryErr: any) {
          throw retryErr;
        }
      } else {
        throw err;
      }
    }

    for (const interceptor of this.interceptors) {
      if (interceptor.afterSet) {
        interceptor.afterSet(ctx);
      }
    }
  }

  /**
   * 同步写入值（仅支持同步驱动）
   */
  set<K extends keyof T & string>(
    key: K,
    value: T[K],
    expire?: number | null,
    options?: CookieOptions,
  ): void {
    try {
      this.setRaw(key, value, expire, options);
    } catch (err: any) {
      if (this.isQuotaExceededError(err) && this.onQuotaExceeded) {
        this.onQuotaExceeded(err, { key, value });
        return;
      }
      throw err;
    }
  }

  /**
   * 异步写入值（同时支持同步和异步驱动）
   */
  async setAsync<K extends keyof T & string>(
    key: K,
    value: T[K],
    expire?: number | null,
    options?: CookieOptions,
  ): Promise<void> {
    try {
      await this.setRawAsync(key, value, expire, options);
    } catch (err: any) {
      if (this.isQuotaExceededError(err) && this.onQuotaExceeded) {
        this.onQuotaExceeded(err, { key, value });
        return;
      }
      throw err;
    }
  }

  /**
   * 同步获取值（仅支持同步驱动）
   */
  get<K extends keyof T & string>(key: K, path?: string, defaultValue?: any): any {
    for (const interceptor of this.interceptors) {
      if (interceptor.beforeGet) {
        interceptor.beforeGet(key);
      }
    }

    const data = this.getStoredData(this.getFullKey(key));
    let result = data === null ? defaultValue : getValueByPath(data.value, path || "", defaultValue);

    for (const interceptor of this.interceptors) {
      if (interceptor.afterGet) {
        result = interceptor.afterGet(key, result);
      }
    }

    return result;
  }

  /**
   * 异步获取值（支持同步与全异步 IndexedDB 引擎）
   */
  async getAsync<K extends keyof T & string>(key: K, path?: string, defaultValue?: any): Promise<any> {
    for (const interceptor of this.interceptors) {
      if (interceptor.beforeGet) {
        interceptor.beforeGet(key);
      }
    }

    const data = await this.getStoredDataAsync(this.getFullKey(key));
    let result = data === null ? defaultValue : getValueByPath(data.value, path || "", defaultValue);

    for (const interceptor of this.interceptors) {
      if (interceptor.afterGet) {
        result = interceptor.afterGet(key, result);
      }
    }

    return result;
  }

  /**
   * 批量同步获取（仅支持同步驱动）
   */
  getItems(keys: (keyof T & string)[], path?: string): Record<string, any> {
    this.checkAsyncDriverConflict("getItems");
    for (const key of keys) {
      for (const interceptor of this.interceptors) {
        if (interceptor.beforeGet) {
          interceptor.beforeGet(key);
        }
      }
    }

    const fullKeys = keys.map((k) => this.getFullKey(k));
    const rawResult = this.driver.getItems(fullKeys) as Record<string, string | null>;
    const result: Record<string, any> = {};

    keys.forEach((key) => {
      const fullKey = this.getFullKey(key);
      const serialized = rawResult[fullKey];
      let val: any;

      if (serialized === null) {
        val = undefined;
      } else {
        try {
          const data: StorageData = this.serializer.deserialize(serialized);
          if (data && data.expire !== null && data.expire < Date.now()) {
            this.driver.removeItem(fullKey, this.defaultCookieOptions);
            this.cache.delete(fullKey);
            val = undefined;
          } else {
            if (this.integrity) {
              const expectedSig = generateHash(JSON.stringify(data.value) + this.secretSalt);
              if (!data.signature || data.signature !== expectedSig) {
                console.warn(`[StorageWrapper] Data integrity check failed for key "${fullKey}". Evicting tampered data.`);
                this.driver.removeItem(fullKey, this.defaultCookieOptions);
                this.cache.delete(fullKey);
                val = undefined;
              } else {
                this.cache.set(fullKey, data);
                val = getValueByPath(data.value, path || "", undefined);
              }
            } else {
              this.cache.set(fullKey, data);
              val = getValueByPath(data.value, path || "", undefined);
            }
          }
        } catch {
          val = getValueByPath(serialized, path || "", undefined);
        }
      }

      for (const interceptor of this.interceptors) {
        if (interceptor.afterGet) {
          val = interceptor.afterGet(key, val);
        }
      }
      result[key] = val;
    });

    return result;
  }

  /**
   * 批量异步获取（同时支持同步和异步驱动）
   */
  async getItemsAsync(keys: (keyof T & string)[], path?: string): Promise<Record<string, any>> {
    for (const key of keys) {
      for (const interceptor of this.interceptors) {
        if (interceptor.beforeGet) {
          interceptor.beforeGet(key);
        }
      }
    }

    const fullKeys = keys.map((k) => this.getFullKey(k));
    const rawResult = await this.driver.getItems(fullKeys);
    const result: Record<string, any> = {};

    for (const key of keys) {
      const fullKey = this.getFullKey(key);
      const serialized = rawResult[fullKey];
      let val: any;

      if (serialized === null) {
        val = undefined;
      } else {
        try {
          const data: StorageData = this.serializer.deserialize(serialized);
          if (data && data.expire !== null && data.expire < Date.now()) {
            await this.driver.removeItem(fullKey, this.defaultCookieOptions);
            this.cache.delete(fullKey);
            val = undefined;
          } else {
            if (this.integrity) {
              const expectedSig = generateHash(JSON.stringify(data.value) + this.secretSalt);
              if (!data.signature || data.signature !== expectedSig) {
                console.warn(`[StorageWrapper] Data integrity check failed for key "${fullKey}". Evicting tampered data.`);
                await this.driver.removeItem(fullKey, this.defaultCookieOptions);
                this.cache.delete(fullKey);
                val = undefined;
              } else {
                this.cache.set(fullKey, data);
                val = getValueByPath(data.value, path || "", undefined);
              }
            } else {
              this.cache.set(fullKey, data);
              val = getValueByPath(data.value, path || "", undefined);
            }
          }
        } catch {
          val = getValueByPath(serialized, path || "", undefined);
        }
      }

      for (const interceptor of this.interceptors) {
        if (interceptor.afterGet) {
          val = interceptor.afterGet(key, val);
        }
      }
      result[key] = val;
    }

    return result;
  }

  /**
   * 批量同步写入（支持完整的事务回滚还原，仅支持同步驱动）
   */
  setItems(
    pairs: Partial<T>,
    expire?: number | null,
    options?: CookieOptions,
  ): void {
    this.checkAsyncDriverConflict("setItems");
    const keysToUpdate = Object.keys(pairs) as (keyof T & string)[];
    const fullKeys = keysToUpdate.map((k) => this.getFullKey(k));

    const backup = this.driver.getItems(fullKeys) as Record<string, string | null>;
    const writtenKeys: string[] = [];

    try {
      for (const [key, value] of Object.entries(pairs)) {
        this.setRaw(key as any, value as any, expire, options);
        writtenKeys.push(key);
      }
    } catch (err: any) {
      // 执行物理与逻辑内存回滚
      writtenKeys.forEach((key) => {
        const fullKey = this.getFullKey(key);
        const oldSerialized = backup[fullKey];
        if (oldSerialized === null) {
          this.driver.removeItem(fullKey, { ...this.defaultCookieOptions, ...options });
          this.cache.delete(fullKey);
        } else {
          let oldExpireTime: number | null = null;
          let oldData: StorageData | null = null;
          try {
            const parsed = this.serializer.deserialize(oldSerialized);
            if (parsed) {
              oldData = parsed;
              oldExpireTime = parsed.expire;
            }
          } catch {}
          
          this.driver.setItem(fullKey, oldSerialized, oldExpireTime, { ...this.defaultCookieOptions, ...options });
          if (oldData) {
            this.cache.set(fullKey, oldData);
          }
        }
      });

      if (this.isQuotaExceededError(err) && this.onQuotaExceeded) {
        const failedKey = keysToUpdate[writtenKeys.length];
        const failedValue = pairs[failedKey];
        this.onQuotaExceeded(err, { key: failedKey, value: failedValue });
        return;
      }
      throw err;
    }
  }

  /**
   * 批量异步写入（带 Promise 事务性原子回滚，支持异步底座）
   */
  async setItemsAsync(
    pairs: Partial<T>,
    expire?: number | null,
    options?: CookieOptions,
  ): Promise<void> {
    const keysToUpdate = Object.keys(pairs) as (keyof T & string)[];
    const fullKeys = keysToUpdate.map((k) => this.getFullKey(k));

    const backup = await this.driver.getItems(fullKeys);
    const writtenKeys: string[] = [];

    try {
      for (const [key, value] of Object.entries(pairs)) {
        await this.setRawAsync(key as any, value as any, expire, options);
        writtenKeys.push(key);
      }
    } catch (err: any) {
      // 事务回滚还原
      for (const key of writtenKeys) {
        const fullKey = this.getFullKey(key);
        const oldSerialized = backup[fullKey];
        if (oldSerialized === null) {
          await this.driver.removeItem(fullKey, { ...this.defaultCookieOptions, ...options });
          this.cache.delete(fullKey);
        } else {
          let oldExpireTime: number | null = null;
          let oldData: StorageData | null = null;
          try {
            const parsed = this.serializer.deserialize(oldSerialized);
            if (parsed) {
              oldData = parsed;
              oldExpireTime = parsed.expire;
            }
          } catch {}
          
          await this.driver.setItem(fullKey, oldSerialized, oldExpireTime, { ...this.defaultCookieOptions, ...options });
          if (oldData) {
            this.cache.set(fullKey, oldData);
          }
        }
      }

      if (this.isQuotaExceededError(err) && this.onQuotaExceeded) {
        const failedKey = keysToUpdate[writtenKeys.length];
        const failedValue = pairs[failedKey];
        this.onQuotaExceeded(err, { key: failedKey, value: failedValue });
        return;
      }
      throw err;
    }
  }

  /**
   * 同步移除特定键（仅支持同步驱动）
   */
  remove<K extends keyof T & string>(key: K, options?: CookieOptions): void {
    this.checkAsyncDriverConflict("remove");
    const fullKey = this.getFullKey(key);
    const mergedCookieOptions = { ...this.defaultCookieOptions, ...options };
    this.driver.removeItem(fullKey, mergedCookieOptions);
    this.cache.delete(fullKey);
    this.sendBroadcast("remove", { key });
  }

  /**
   * 异步移除特定键（同时支持同步和异步驱动）
   */
  async removeAsync<K extends keyof T & string>(key: K, options?: CookieOptions): Promise<void> {
    const fullKey = this.getFullKey(key);
    const mergedCookieOptions = { ...this.defaultCookieOptions, ...options };
    await this.driver.removeItem(fullKey, mergedCookieOptions);
    this.cache.delete(fullKey);
    this.sendBroadcast("remove", { key });
  }

  /**
   * 批量同步删除（仅支持同步驱动）
   */
  removeItems(keys: (keyof T & string)[], options?: CookieOptions): void {
    this.checkAsyncDriverConflict("removeItems");
    const fullKeys = keys.map((k) => this.getFullKey(k));
    const mergedCookieOptions = { ...this.defaultCookieOptions, ...options };
    this.driver.removeItems(fullKeys, mergedCookieOptions);
    fullKeys.forEach((fk) => this.cache.delete(fk));
    this.sendBroadcast("remove", { keys });
  }

  /**
   * 批量异步删除（同时支持同步和异步驱动）
   */
  async removeItemsAsync(keys: (keyof T & string)[], options?: CookieOptions): Promise<void> {
    const fullKeys = keys.map((k) => this.getFullKey(k));
    const mergedCookieOptions = { ...this.defaultCookieOptions, ...options };
    await this.driver.removeItems(fullKeys, mergedCookieOptions);
    fullKeys.forEach((fk) => this.cache.delete(fk));
    this.sendBroadcast("remove", { keys });
  }

  /**
   * 同步清空实例关联项（仅支持同步驱动）
   */
  clear(): void {
    this.checkAsyncDriverConflict("clear");
    const allKeys = this.driver.keys() as string[];
    allKeys.forEach((key) => {
      if (this.matchKey(key)) {
        this.driver.removeItem(key, this.defaultCookieOptions);
        this.cache.delete(key);
      }
    });
    this.sendBroadcast("clear");
  }

  /**
   * 异步清空实例关联项（同时支持同步和异步驱动）
   */
  async clearAsync(): Promise<void> {
    const allKeys = await this.driver.keys();
    for (const key of allKeys) {
      if (this.matchKey(key)) {
        await this.driver.removeItem(key, this.defaultCookieOptions);
        this.cache.delete(key);
      }
    }
    this.sendBroadcast("clear");
  }

  /**
   * 判断某个键是否存在（仅支持同步驱动）
   */
  has<K extends keyof T & string>(key: K): boolean {
    return this.getStoredData(this.getFullKey(key)) !== null;
  }

  /**
   * 异步判断某个键是否存在（支持异步驱动底座）
   */
  async hasAsync<K extends keyof T & string>(key: K): Promise<boolean> {
    const data = await this.getStoredDataAsync(this.getFullKey(key));
    return data !== null;
  }

  /**
   * 订阅特定 key 的数据变动（单键订阅）
   */
  onChange<K extends keyof T & string>(
    key: K,
    callback: (val: T[K] | undefined) => void,
  ): () => void;
  /**
   * 订阅多个 key 的数据变动（多键订阅）
   */
  onChange<K extends keyof T & string>(
    keys: K[],
    callback: (key: K, val: T[K] | undefined) => void,
  ): () => void;
  onChange(
    keyOrKeys: any,
    callback: any,
  ): () => void {
    const isArray = Array.isArray(keyOrKeys);
    const keys: string[] = isArray ? keyOrKeys : [keyOrKeys];
    const fullKeys = keys.map((k) => this.getFullKey(k));
    const subKey = isArray ? `[batch]:${keys.join(",")}` : keys[0];

    if (!this.listeners.has(subKey)) {
      this.listeners.set(subKey, new Set());
      
      const unsubscribeDriver = this.driver.subscribe(fullKeys, (changedPhysicalKey, newValue) => {
        const rawChangedKey = this.getRawKey(changedPhysicalKey);
        let parsedValue: any = undefined;
        let dataNode: StorageData | null = null;

        if (newValue !== null) {
          try {
            const data: StorageData = this.serializer.deserialize(newValue);
            if (this.integrity) {
              const expectedSig = generateHash(JSON.stringify(data.value) + this.secretSalt);
              if (!data.signature || data.signature !== expectedSig) {
                this.cache.delete(changedPhysicalKey);
                // 异步清除或同步清除判断
                if (this.driver.constructor && this.driver.constructor.name === "IndexedDBStorageDriver") {
                  this.driver.removeItem(changedPhysicalKey, this.defaultCookieOptions);
                } else {
                  this.driver.removeItem(changedPhysicalKey, this.defaultCookieOptions);
                }
                return;
              }
            }
            dataNode = data;
            parsedValue = data.value;
          } catch {
            parsedValue = newValue;
            dataNode = { value: newValue, expire: null };
          }
        }

        if (dataNode === null) {
          this.cache.delete(changedPhysicalKey);
        } else {
          this.cache.set(changedPhysicalKey, dataNode);
        }

        const lastSeen = this.lastSeenValues.get(subKey);
        if (isEqual(lastSeen, parsedValue)) {
          return;
        }
        this.lastSeenValues.set(subKey, parsedValue);

        const handlers = this.listeners.get(subKey);
        if (handlers) {
          handlers.forEach((fn) => {
            if (isArray) {
              fn(rawChangedKey, parsedValue);
            } else {
              fn(parsedValue);
            }
          });
        }
      });
      this.activeSubscriptions.set(subKey, unsubscribeDriver);
    }

    this.listeners.get(subKey)!.add(callback);

    return () => {
      const handlers = this.listeners.get(subKey);
      if (handlers) {
        handlers.delete(callback);
        if (handlers.size === 0) {
          this.listeners.delete(subKey);
          this.lastSeenValues.delete(subKey);
          const unsubscribeDriver = this.activeSubscriptions.get(subKey);
          if (unsubscribeDriver) {
            unsubscribeDriver();
            this.activeSubscriptions.delete(subKey);
          }
        }
      }
    };
  }

  /**
   * 销毁当前实例，解绑订阅、断开 BroadcastChannel 并释放内存缓存
   */
  destroy(): void {
    if (this.gcTimer) {
      clearInterval(this.gcTimer);
      this.gcTimer = null;
    }
    if (this.broadcastChannel) {
      this.broadcastChannel.close();
      this.broadcastChannel = null;
    }
    this.activeSubscriptions.forEach((unsubscribe) => unsubscribe());
    this.activeSubscriptions.clear();
    this.listeners.clear();
    this.cache.clear();
    this.lastSeenValues.clear();
  }

  /**
   * 同步获取大小（仅支持同步驱动）
   */
  size(): number;
  size(key: keyof T & string): number;
  size(keys: (keyof T & string)[]): Record<string, number>;
  size(keyOrKeys?: (keyof T & string) | (keyof T & string)[]): number | Record<string, number> {
    this.checkAsyncDriverConflict("size");
    if (keyOrKeys === undefined) {
      let count = 0;
      const allKeys = this.driver.keys() as string[];
      allKeys.forEach((key) => {
        if (this.matchKey(key)) {
          count++;
        }
      });
      return count;
    }
    if (Array.isArray(keyOrKeys)) {
      const fullKeys = keyOrKeys.map((k) => this.getFullKey(k));
      const rawSizes = this.driver.size(fullKeys) as Record<string, number>;
      const sizes: Record<string, number> = {};
      keyOrKeys.forEach((key, index) => {
        const fullKey = fullKeys[index];
        sizes[key] = rawSizes[fullKey];
      });
      return sizes;
    }
    return this.driver.size(this.getFullKey(keyOrKeys)) as number;
  }

  /**
   * 异步获取大小（支持同步与全异步 IndexedDB 引擎）
   */
  sizeAsync(): Promise<number>;
  sizeAsync(key: keyof T & string): Promise<number>;
  sizeAsync(keys: (keyof T & string)[]): Promise<Record<string, number>>;
  async sizeAsync(keyOrKeys?: (keyof T & string) | (keyof T & string)[]): Promise<number | Record<string, number>> {
    if (keyOrKeys === undefined) {
      let count = 0;
      const allKeys = await this.driver.keys();
      allKeys.forEach((key) => {
        if (this.matchKey(key)) {
          count++;
        }
      });
      return count;
    }
    if (Array.isArray(keyOrKeys)) {
      const fullKeys = keyOrKeys.map((k) => this.getFullKey(k));
      const rawSizes = await this.driver.size(fullKeys) as Record<string, number>;
      const sizes: Record<string, number> = {};
      keyOrKeys.forEach((key, index) => {
        const fullKey = fullKeys[index];
        sizes[key] = rawSizes[fullKey];
      });
      return sizes;
    }
    const sizeVal = await this.driver.size(this.getFullKey(keyOrKeys));
    return sizeVal as number;
  }

  /**
   * 检查完整的物理键名是否同时匹配当前实例配置的前缀和后缀
   */
  private matchKey(fullKey: string): boolean {
    const startsWithPrefix = this.prefix ? fullKey.startsWith(this.prefix) : true;
    const endsWithSuffix = this.suffix ? fullKey.endsWith(this.suffix) : true;
    return startsWithPrefix && endsWithSuffix;
  }
}
