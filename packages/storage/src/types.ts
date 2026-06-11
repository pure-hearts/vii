export interface CookieOptions {
  domain?: string;
  path?: string;
  secure?: boolean;
  sameSite?: "Lax" | "Strict" | "None";
}

export interface Serializer {
  serialize: (value: any) => string;
  deserialize: (serialized: string) => any;
}

export interface StorageInterceptorContext {
  key: string;
  value?: any;
  expire?: number | null;
  options?: any;
}

export interface StorageInterceptor {
  beforeSet?: (ctx: StorageInterceptorContext) => StorageInterceptorContext | false | void;
  afterSet?: (ctx: StorageInterceptorContext) => void;
  beforeGet?: (key: string) => void;
  afterGet?: (key: string, value: any) => any;
}

export interface StorageOptions {
  prefix?: string;
  suffix?: string;
  expire?: number;
  serializer?: Serializer;
  cookieOptions?: CookieOptions;
  interceptors?: StorageInterceptor[];
  gcInterval?: number;
  onQuotaExceeded?: (err: Error, context: { key: string; value: any }) => void;
  integrity?: boolean;
  secretSalt?: string;
  broadcast?: boolean;
}

export interface StorageData<T = any> {
  value: T;
  expire: number | null;
  signature?: string;
}

export interface StorageDriver {
  getItem(key: string): string | null | Promise<string | null>;
  setItem(key: string, value: string, expireTime?: number | null, options?: CookieOptions): void | Promise<void>;
  removeItem(key: string, options?: CookieOptions): void | Promise<void>;
  hasItem(key: string): boolean | Promise<boolean>;
  clear(options?: CookieOptions): void | Promise<void>;
  keys(): string[] | Promise<string[]>;
  getItems(keys: string[]): Record<string, string | null> | Promise<Record<string, string | null>>;
  setItems(pairs: Record<string, string>, expireTime?: number | null, options?: CookieOptions): void | Promise<void>;
  removeItems(keys: string[], options?: CookieOptions): void | Promise<void>;
  
  // 一个 size 接口同时支持：获取总数(全部)、单键大小(单个)、多键大小(多个)
  size(): number | Promise<number>;
  size(key: string): number | Promise<number>;
  size(keys: string[]): Record<string, number> | Promise<Record<string, number>>;
  size(keyOrKeys?: string | string[]): number | Record<string, number> | Promise<number | Record<string, number>>;

  // 监听变动
  subscribe(
    key: string | string[] | null,
    callback: (key: string, newValue: string | null) => void
  ): () => void;

  // 底层物理监控与容量评估接口
  totalCount(): number | Promise<number>;
  totalSize(): number | Promise<number>;
}
