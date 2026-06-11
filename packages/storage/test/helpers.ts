// 内存中简易的浏览器 Storage Mock
export class MemoryStorage implements Storage {
  private store = new Map<string, string>();
  get length() {
    return this.store.size;
  }
  clear() {
    this.store.clear();
  }
  getItem(key: string) {
    return this.store.get(key) ?? null;
  }
  key(index: number) {
    return Array.from(this.store.keys())[index] ?? null;
  }
  removeItem(key: string) {
    this.store.delete(key);
  }
  setItem(key: string, value: string) {
    this.store.set(key, value);
  }
}

// 用于跟踪 Cookie 状态的上下文，防止基本类型变量导出的引用丢失问题
export const cookieState = {
  store: "",
  lastSetRawCookie: "",
  clear() {
    this.store = "";
    this.lastSetRawCookie = "";
  },
};

export const documentMock = {
  get cookie() {
    return cookieState.store;
  },
  set cookie(val: string) {
    cookieState.lastSetRawCookie = val;
    const parts = val.split(";");
    const mainPart = parts[0].trim();
    if (!mainPart) return;

    const eqIndex = mainPart.indexOf("=");
    const name = eqIndex > -1 ? mainPart.slice(0, eqIndex) : mainPart;
    const value = eqIndex > -1 ? mainPart.slice(eqIndex + 1) : "";

    const expiresPart = parts.find((p) => p.trim().startsWith("expires="));
    const isDelete =
      expiresPart && (expiresPart.includes("1970") || expiresPart.includes("Thu, 01 Jan"));

    const currentCookies = cookieState.store
      .split(";")
      .map((c) => c.trim())
      .filter(Boolean);
    const index = currentCookies.findIndex((c) => c.startsWith(name + "="));

    if (isDelete) {
      if (index > -1) {
        currentCookies.splice(index, 1);
      }
    } else {
      const newCookie = `${name}=${value}`;
      if (index > -1) {
        currentCookies[index] = newCookie;
      } else {
        currentCookies.push(newCookie);
      }
    }
    cookieState.store = currentCookies.join("; ");
  },
};

// 使用 EventTarget 模拟 window，使得浏览器原生事件分发（dispatchEvent）能够运行
export class WindowMock extends EventTarget {
  localStorage = new MemoryStorage();
  sessionStorage = new MemoryStorage();
}

export function setupTestEnv() {
  globalThis.window = new WindowMock() as any;
  globalThis.document = documentMock as any;
  // Node 端没有原生的 StorageEvent 全局定义，我们简单 Mock 出来以供测试使用
  globalThis.StorageEvent = class StorageEvent extends Event {
    key: string | null;
    newValue: string | null;
    storageArea: Storage | null;
    constructor(type: string, eventInitDict?: any) {
      super(type, eventInitDict);
      this.key = eventInitDict?.key ?? null;
      this.newValue = eventInitDict?.newValue ?? null;
      this.storageArea = eventInitDict?.storageArea ?? null;
    }
  } as any;

  // 挂载 Mock IndexedDB
  if (!globalThis.indexedDB) {
    globalThis.indexedDB = {
      open: (name: string, version?: number) => {
        if (!mockDatabases.has(name)) {
          mockDatabases.set(name, new MockIDBDatabase());
        }
        const dbInstance = mockDatabases.get(name)!;
        const req = new MockIDBRequest();
        setTimeout(() => {
          req.result = dbInstance;
          req.dispatchEvent(new Event("success"));
        }, 0);
        return req as any;
      },
    } as any;
  }

  // 挂载 Mock BroadcastChannel
  if (!globalThis.BroadcastChannel) {
    globalThis.BroadcastChannel = MockBroadcastChannel as any;
  }
  if (globalThis.window) {
    (globalThis.window as any).BroadcastChannel = globalThis.BroadcastChannel;
  }
}

// 可全局导出以便重置
const mockDatabases = new Map<string, MockIDBDatabase>();
export const mockIndexedDBState = {
  clear() {
    mockDatabases.clear();
  },
};

// --- 简易 Mock IndexedDB 实现 ---
class MockIDBRequest extends EventTarget {
  result: any;
  error: any;
  set onsuccess(cb: any) {
    this.addEventListener("success", cb);
  }
  set onerror(cb: any) {
    this.addEventListener("error", cb);
  }
  set onupgradeneeded(cb: any) {
    this.addEventListener("upgradeneeded", cb);
  }
}

class MockIDBObjectStore {
  private data = new Map<string, any>();

  get(key: string) {
    const req = new MockIDBRequest();
    setTimeout(() => {
      req.result = this.data.get(key);
      req.dispatchEvent(new Event("success"));
    }, 0);
    return req;
  }

  getKey(key: string) {
    const req = new MockIDBRequest();
    setTimeout(() => {
      req.result = this.data.has(key) ? key : undefined;
      req.dispatchEvent(new Event("success"));
    }, 0);
    return req;
  }

  put(value: any, key: string) {
    const req = new MockIDBRequest();
    setTimeout(() => {
      this.data.set(key, value);
      req.result = key;
      req.dispatchEvent(new Event("success"));
    }, 0);
    return req;
  }

  delete(key: string) {
    const req = new MockIDBRequest();
    setTimeout(() => {
      this.data.delete(key);
      req.result = undefined;
      req.dispatchEvent(new Event("success"));
    }, 0);
    return req;
  }

  clear() {
    const req = new MockIDBRequest();
    setTimeout(() => {
      this.data.clear();
      req.result = undefined;
      req.dispatchEvent(new Event("success"));
    }, 0);
    return req;
  }

  getAllKeys() {
    const req = new MockIDBRequest();
    setTimeout(() => {
      req.result = Array.from(this.data.keys());
      req.dispatchEvent(new Event("success"));
    }, 0);
    return req;
  }

  count() {
    const req = new MockIDBRequest();
    setTimeout(() => {
      req.result = this.data.size;
      req.dispatchEvent(new Event("success"));
    }, 0);
    return req;
  }
}

class MockIDBTransaction extends EventTarget {
  storeName: string;
  store: MockIDBObjectStore;
  constructor(storeName: string, store: MockIDBObjectStore) {
    super();
    this.storeName = storeName;
    this.store = store;
  }

  objectStore(name: string) {
    return this.store;
  }

  set oncomplete(cb: any) {
    this.addEventListener("complete", cb);
  }
  set onerror(cb: any) {
    this.addEventListener("error", cb);
  }

  triggerComplete() {
    setTimeout(() => {
      this.dispatchEvent(new Event("complete"));
    }, 1);
  }
}

class MockIDBDatabase extends EventTarget {
  objectStoreNames = {
    contains: (name: string) => true,
  };
  private stores = new Map<string, MockIDBObjectStore>();

  getStore(name: string) {
    if (!this.stores.has(name)) {
      this.stores.set(name, new MockIDBObjectStore());
    }
    return this.stores.get(name)!;
  }

  transaction(storeName: string, mode: string) {
    const store = this.getStore(storeName);
    const tx = new MockIDBTransaction(storeName, store);
    tx.triggerComplete();
    return tx;
  }
}

// --- 简易 Mock BroadcastChannel 实现 ---
class MockBroadcastChannel extends EventTarget {
  name: string;
  private static channels = new Map<string, Set<MockBroadcastChannel>>();

  constructor(name: string) {
    super();
    this.name = name;
    if (!MockBroadcastChannel.channels.has(name)) {
      MockBroadcastChannel.channels.set(name, new Set());
    }
    MockBroadcastChannel.channels.get(name)!.add(this);
  }

  postMessage(message: any) {
    const channels = MockBroadcastChannel.channels.get(this.name);
    if (channels) {
      channels.forEach((channel) => {
        if (channel !== this) {
          setTimeout(() => {
            channel.dispatchEvent(new MessageEvent("message", { data: message }));
          }, 0);
        }
      });
    }
  }

  close() {
    const channels = MockBroadcastChannel.channels.get(this.name);
    if (channels) {
      channels.delete(this);
      if (channels.size === 0) {
        MockBroadcastChannel.channels.delete(this.name);
      }
    }
  }

  set onmessage(cb: any) {
    this.addEventListener("message", cb);
  }
}
