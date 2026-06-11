import type { Serializer } from "./types";

export const IS_BROWSER = () => typeof window !== "undefined";
export const HAS_DOCUMENT = () => typeof document !== "undefined";
export const HAS_INDEXEDDB = () => typeof indexedDB !== "undefined";
export const HAS_BROADCAST_CHANNEL = () => typeof window !== "undefined" && typeof BroadcastChannel !== "undefined";
export const HAS_REQUEST_IDLE_CALLBACK = () => typeof window !== "undefined" && typeof (window as any).requestIdleCallback !== "undefined";

/**
 * 对象嵌套属性提取器，支持 a.b.c 或者是 items[0].name 等复杂提取
 * @param obj 目标对象
 * @param path 嵌套属性路径
 * @param defaultValue 默认值
 */
export function getValueByPath(obj: any, path: string, defaultValue: any): any {
  if (!path) return obj;
  const keys = path.replace(/\[['"]?([^'"]+)['"]?\]/g, ".$1").split(".").filter(Boolean);
  const result = keys.reduce((acc, key) => (acc != null ? acc[key] : undefined), obj);
  return result === undefined ? defaultValue : result;
}

/**
 * 默认序列化器
 */
export const defaultSerializer: Serializer = {
  serialize: (val) => JSON.stringify(val),
  deserialize: (str) => JSON.parse(str),
};

/**
 * 深度比较两个值是否完全一致（深比较）
 */
export function isEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (a && b && typeof a === "object" && typeof b === "object") {
    if (a.constructor !== b.constructor) return false;
    if (Array.isArray(a)) {
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) {
        if (!isEqual(a[i], b[i])) return false;
      }
      return true;
    }
    const keys = Object.keys(a);
    if (keys.length !== Object.keys(b).length) return false;
    for (const key of keys) {
      if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
      if (!isEqual(a[key], b[key])) return false;
    }
    return true;
  }
  // 处理 NaN === NaN 情况
  return a !== a && b !== b;
}

/**
 * 简易且碰撞率极低的 DJB2 字符串哈希生成算法，支持 36 进制输出
 */
export function generateHash(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}
