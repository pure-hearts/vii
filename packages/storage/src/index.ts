import { StorageWrapper } from "./storage";
import { MemoryStorageDriver } from "./drivers/memory";
import { WebStorageDriver } from "./drivers/web";
import type { StorageOptions, CookieOptions, Serializer, StorageDriver } from "./types";

export { StorageWrapper, MemoryStorageDriver, WebStorageDriver };
export type { StorageOptions, CookieOptions, Serializer, StorageDriver };

/**
 * 创建自定义存储实例的工厂函数
 */
export function createStorage<T extends Record<string, any> = Record<string, any>>(
  type: "local" | "session" | StorageDriver,
  options?: StorageOptions,
): StorageWrapper<T> {
  return new StorageWrapper<T>(type as any, options);
}
