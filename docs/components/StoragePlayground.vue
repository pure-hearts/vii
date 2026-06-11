<template>
  <div class="storage-playground">
    <!-- 控制面板：模板选择 -->
    <div class="control-bar">
      <label for="template-select" class="control-label">选择示例模板：</label>
      <select
        id="template-select"
        v-model="selectedTemplate"
        @change="loadTemplate"
        class="template-dropdown"
      >
        <option value="basic">1. 基础读写与嵌套路径获取</option>
        <option value="ttl">2. 过期时长控制 (TTL) 与 GC</option>
        <option value="integrity">3. 防篡改完整性签名指纹</option>
        <option value="async">4. 异步 IndexedDB 与 API 冲突拦截</option>
      </select>
    </div>

    <div class="playground-layout">
      <!-- 左侧：代码编辑与运行、控制台输出 -->
      <div class="editor-section">
        <div class="section-title">
          <span>📝 代码编辑区</span>
          <div class="button-group">
            <button @click="executeCode" class="btn btn-run">⚡ 运行代码</button>
            <button @click="resetCode" class="btn btn-reset">重置</button>
          </div>
        </div>
        <div class="code-container">
          <textarea
            v-model="code"
            class="code-textarea"
            placeholder="在此输入或编辑您的 JavaScript 代码..."
            rows="12"
          ></textarea>
        </div>

        <div class="console-title">🖥️ 运行日志控制台</div>
        <div class="console-box">
          <div v-if="logs.length === 0" class="console-placeholder">等待代码运行...</div>
          <div
            v-for="(log, idx) in logs"
            :key="idx"
            class="console-line"
            :class="{ 'line-error': log.startsWith('❌') }"
          >
            {{ log }}
          </div>
        </div>
      </div>

      <!-- 右侧：物理存储状态实时监测器 -->
      <div class="monitor-section">
        <div class="section-title">
          <span>📊 物理介质状态监测器</span>
          <button @click="triggerGC" class="btn btn-gc">🧹 运行垃圾回收 (GC)</button>
        </div>

        <!-- LocalStorage 监视卡片 -->
        <div class="monitor-card">
          <div class="card-header">
            <span class="card-badge local-badge">LocalStorage</span>
            <span class="card-desc">物理前缀: <code>playground_</code></span>
          </div>
          <div class="card-body">
            <div v-if="localItems.length === 0" class="item-empty">
              无相关数据 (以 playground_ 开头)
            </div>
            <div v-for="item in localItems" :key="item.key" class="storage-item">
              <div class="item-meta">
                <span class="item-key">{{ item.logicalKey }}</span>
                <span class="item-raw-key">物理键: {{ item.key }}</span>
              </div>
              <div class="item-data">
                <div class="data-row">
                  <strong>值:</strong> <code>{{ item.val }}</code>
                </div>
                <div v-if="item.expire" class="data-row">
                  <strong>过期时间:</strong>
                  <span :class="{ 'text-expired': item.isExpired }">
                    {{ formatTime(item.expire) }} ({{ item.isExpired ? "已过期" : "未过期" }})
                  </span>
                </div>
                <div v-if="item.signature" class="data-row text-sig">
                  <strong>防篡改签名:</strong> <code>{{ item.signature.slice(0, 10) }}...</code>
                </div>
              </div>
              <div class="item-actions">
                <button @click="tamperItem('local', item.key)" class="btn-tamper">
                  ⚠️ 篡改该物理数据
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Cookie 监视卡片 -->
        <div class="monitor-card">
          <div class="card-header">
            <span class="card-badge cookie-badge">Cookie</span>
            <span class="card-desc">物理前缀: <code>playground_</code></span>
          </div>
          <div class="card-body">
            <div v-if="cookieItems.length === 0" class="item-empty">无相关 Cookie 数据</div>
            <div v-for="item in cookieItems" :key="item.key" class="storage-item">
              <div class="item-meta">
                <span class="item-key">{{ item.logicalKey }}</span>
                <span class="item-raw-key">物理 Cookie: {{ item.key }}</span>
              </div>
              <div class="item-data">
                <div class="data-row">
                  <strong>值:</strong> <code>{{ item.val }}</code>
                </div>
              </div>
              <div class="item-actions">
                <button @click="tamperItem('cookie', item.key)" class="btn-tamper">
                  ⚠️ 篡改该物理数据
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- IndexedDB 监视卡片 -->
        <div class="monitor-card">
          <div class="card-header">
            <span class="card-badge idb-badge">IndexedDB</span>
            <span class="card-desc"
              >库: <code>playground_db</code> 表: <code>playground_store</code></span
            >
          </div>
          <div class="card-body">
            <div v-if="idbItems.length === 0" class="item-empty">无相关数据库数据</div>
            <div v-for="item in idbItems" :key="item.key" class="storage-item">
              <div class="item-meta">
                <span class="item-key">{{ item.key }}</span>
              </div>
              <div class="item-data">
                <div class="data-row">
                  <strong>值:</strong> <code>{{ item.val }}</code>
                </div>
                <div v-if="item.expire" class="data-row">
                  <strong>过期时间:</strong>
                  <span :class="{ 'text-expired': item.isExpired }">
                    {{ formatTime(item.expire) }}
                  </span>
                </div>
              </div>
              <div class="item-actions">
                <button @click="tamperItem('idb', item.key)" class="btn-tamper">
                  ⚠️ 篡改该物理数据
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import { createStorage } from "@vyron/storage";
import {
  CookieStorageDriver,
  IndexedDBStorageDriver,
  MemoryStorageDriver,
} from "@vyron/storage/drivers";

const selectedTemplate = ref("basic");
const code = ref("");
const logs = ref([]);
const localItems = ref([]);
const cookieItems = ref([]);
const idbItems = ref([]);

// 预设模板配置
const templates = {
  basic: `// 1. 初始化 LocalStorage 驱动实例，设定命名空间为 playground_
const local = createStorage('local', { prefix: 'playground_' });

// 2. 写入包含多层嵌套结构的 JSON 数据
local.set('user_config', {
  theme: 'dark',
  user: { name: 'Vyron', roles: ['admin', 'developer'] }
});

console.log('✅ 成功写入嵌套属性 user_config 数据');

// 3. 安全获取嵌套属性，支持使用 lodash 风格 path 解析
const theme = local.get('user_config', 'theme');
const name = local.get('user_config', 'user.name');
const role = local.get('user_config', 'user.roles[0]');

console.log('获取到的 theme:', theme);
console.log('获取到的 user.name:', name);
console.log('获取到的 user.roles[0]:', role);

// 4. 获取不存在的属性，安全带入兜底默认值
const age = local.get('user_config', 'user.profile.age', 18);
console.log('未配置属性 age (返回默认值):', age);`,

  ttl: `// 1. 创建默认 3 秒过期的 LocalStorage 存储实例
const store = createStorage('local', {
  prefix: 'playground_',
  expire: 3000 // 默认过期毫秒数
});

// 2. 写入普通项，使用全局过期参数 (3 秒)
store.set('temp_token', 'token_xyz_123');

// 3. 写入永久项，覆盖全局过期设定
store.set('persist_data', 'important_information', null);

// 4. 写入极短项，覆盖为 1 秒过期
store.set('short_item', 'expired_quickly', 1000);

console.log('✅ 写入完成。请在 1 秒后以及 3 秒后观察右侧监控器卡片中的变化！');
console.log('temp_token 初始值:', store.get('temp_token'));
console.log('short_item 初始值:', store.get('short_item'));`,

  integrity: `// 1. 创建具备防篡改完整性校验的存储包装器
const secureStore = createStorage('local', {
  prefix: 'playground_',
  integrity: true, // 开启防篡改签名
  secretSalt: 'PLAYGROUND_SALT_KEY' // 加盐密钥
});

// 2. 写入金币数据
secureStore.set('game_coins', { count: 50 });
console.log('✅ 写入受签名保护的数据 game_coins.');
console.log('当前读取 game_coins 值:', secureStore.get('game_coins'));

console.log('\\n👉 请在右侧物理卡片中点击 "篡改该物理数据" 按钮。');
console.log('然后再点击 [⚡ 运行代码] 再次执行这段代码，观察校验报警！');

// 3. 读取逻辑：当外部物理修改数据时，读取将自动警告并静默丢弃返回 null
// const coins = secureStore.get('game_coins');
// console.log('篡改后读取 game_coins:', coins);`,

  async: `// 1. 实例化 IndexedDB 异步驱动底座
const db = createStorage(new IndexedDBStorageDriver('playground_db', 'playground_store'));

// 2. 针对纯异步底层驱动，必须调用 Async 后缀方法，否则直接引发冲突拦截报错
console.log('正在执行异步存储写入...');
await db.setAsync('async_info', { title: 'IndexedDB 缓存', vol: '100MB' });

const result = await db.getAsync('async_info');
console.log('✅ IndexedDB 异步读取成功:', result);

// 3. 错误演示：如果强行调用同步 API，观察拦截输出：
try {
  console.log('尝试调用同步 get() 操作异步驱动...');
  db.get('async_info');
} catch (err) {
  console.log('❌ 捕获到 API 冲突拦截报错:', err.message);
}`,
};

const mockConsole = {
  log: (...args) => {
    logs.value.push(
      args
        .map((arg) => (typeof arg === "object" ? JSON.stringify(arg, null, 2) : String(arg)))
        .join(" "),
    );
  },
  error: (...args) => {
    logs.value.push(
      "❌ Error: " +
        args
          .map((arg) => (typeof arg === "object" ? JSON.stringify(arg, null, 2) : String(arg)))
          .join(" "),
    );
  },
};

const loadTemplate = () => {
  code.value = templates[selectedTemplate.value] || "";
};

const resetCode = () => {
  loadTemplate();
  logs.value = [];
};

// 模拟动态代码执行
const executeCode = async () => {
  logs.value = [];
  try {
    // 注入全局可调用的驱动和包装器
    const run = new Function(
      "createStorage",
      "CookieStorageDriver",
      "IndexedDBStorageDriver",
      "MemoryStorageDriver",
      "console",
      `return (async () => {
        ${code.value}
      })()`,
    );

    await run(
      createStorage,
      CookieStorageDriver,
      IndexedDBStorageDriver,
      MemoryStorageDriver,
      mockConsole,
    );

    // 延迟 50ms 刷新物理数据，确保异步操作在 IndexedDB 中完成
    setTimeout(refreshAll, 100);
  } catch (err) {
    mockConsole.error(err.message);
  }
};

// 刷新 LocalStorage
const refreshLocal = () => {
  if (typeof window === "undefined") return;
  const list = [];
  const now = Date.now();
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith("playground_")) {
      const raw = localStorage.getItem(key);
      let logicalKey = key.replace("playground_", "");
      let val = raw;
      let expire = null;
      let signature = null;
      let isExpired = false;

      try {
        const parsed = JSON.parse(raw);
        // 符合包装后的数据协议 {"value": ..., "expire": ..., "signature": ...}
        if (parsed && "value" in parsed) {
          val = JSON.stringify(parsed.value);
          expire = parsed.expire;
          signature = parsed.signature;
          if (expire && now > expire) {
            isExpired = true;
          }
        }
      } catch (e) {
        // 普通字符串
      }

      list.push({ key, logicalKey, val, expire, signature, isExpired });
    }
  }
  localItems.value = list;
};

// 刷新 Cookies
const refreshCookies = () => {
  if (typeof document === "undefined") return;
  const list = [];
  const cookies = document.cookie.split(";");
  for (let c of cookies) {
    c = c.trim();
    if (c.startsWith("playground_")) {
      const idx = c.indexOf("=");
      if (idx !== -1) {
        const key = c.slice(0, idx);
        const logicalKey = key.replace("playground_", "");
        let val = c.slice(idx + 1);
        try {
          // 很多 Cookie 会被 encodeURIComponent，做下 decode
          val = decodeURIComponent(val);
          const parsed = JSON.parse(val);
          if (parsed && "value" in parsed) {
            val = JSON.stringify(parsed.value);
          }
        } catch (e) {}
        list.push({ key, logicalKey, val });
      }
    }
  }
  cookieItems.value = list;
};

// 刷新 IndexedDB
const refreshIndexedDB = () => {
  if (typeof window === "undefined") return;
  try {
    const dbRequest = window.indexedDB.open("playground_db");
    dbRequest.onsuccess = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains("playground_store")) {
        idbItems.value = [];
        return;
      }
      const transaction = db.transaction(["playground_store"], "readonly");
      const objectStore = transaction.objectStore("playground_store");
      const items = [];
      const now = Date.now();
      objectStore.openCursor().onsuccess = (cursorEvent) => {
        const cursor = cursorEvent.target.result;
        if (cursor) {
          let val = cursor.value;
          let expire = null;
          let isExpired = false;
          try {
            const parsed = JSON.parse(cursor.value);
            if (parsed && "value" in parsed) {
              val = JSON.stringify(parsed.value);
              expire = parsed.expire;
              if (expire && now > expire) {
                isExpired = true;
              }
            }
          } catch (e) {}
          items.push({ key: cursor.key, val, expire, isExpired });
          cursor.continue();
        } else {
          idbItems.value = items;
        }
      };
    };
    dbRequest.onerror = () => {
      idbItems.value = [];
    };
  } catch (e) {
    idbItems.value = [];
  }
};

const refreshAll = () => {
  refreshLocal();
  refreshCookies();
  refreshIndexedDB();
};

// 手动垃圾回收 (GC)
const triggerGC = () => {
  try {
    // 实例化一个临时的 LocalStorage 包装器来执行 GC
    const local = createStorage("local", { prefix: "playground_" });
    local.runGC();
    logs.value.push("🧹 已手动执行 GC 扫描清理过期物理数据！");
    refreshAll();
  } catch (e) {
    mockConsole.error("GC 执行错误: " + e.message);
  }
};

// 物理篡改数据
const tamperItem = (type, key) => {
  if (type === "local") {
    const raw = localStorage.getItem(key);
    try {
      const parsed = JSON.parse(raw);
      if (parsed && "value" in parsed) {
        // 直接篡改内部值，但不修改指纹签名以破坏校验
        if (typeof parsed.value === "object") {
          parsed.value.count = (parsed.value.count || 0) + 9999999; // 模拟作弊增加游戏币
          parsed.value.amount = 9999999;
        } else {
          parsed.value = "HACKED_VALUE";
        }
        localStorage.setItem(key, JSON.stringify(parsed));
        logs.value.push(
          `⚠️ [黑客模拟] 物理修改 LocalStorage [${key}] 的内容为：${JSON.stringify(parsed)}`,
        );
      } else {
        localStorage.setItem(key, "HACKED");
      }
    } catch (e) {
      localStorage.setItem(key, "HACKED_RAW_VALUE");
    }
  } else if (type === "cookie") {
    document.cookie = `${key}=HACKED_COOKIE_VALUE; path=/`;
    logs.value.push(`⚠️ [黑客模拟] 物理修改 Cookie [${key}] 的值为 HACKED_COOKIE_VALUE`);
  } else if (type === "idb") {
    // 物理篡改 IndexedDB
    try {
      const dbRequest = window.indexedDB.open("playground_db");
      dbRequest.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction(["playground_store"], "readwrite");
        const objectStore = transaction.objectStore("playground_store");
        objectStore.put("HACKED_INDEXEDDB_VALUE", key).onsuccess = () => {
          logs.value.push(
            `⚠️ [黑客模拟] 物理修改 IndexedDB 表键 [${key}] 为 HACKED_INDEXEDDB_VALUE`,
          );
          refreshAll();
        };
      };
    } catch (e) {}
  }
  refreshAll();
};

const formatTime = (ts) => {
  if (!ts) return "";
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}:${d.getSeconds().toString().padStart(2, "0")}.${d.getMilliseconds().toString().padStart(3, "0")}`;
};

let monitorTimer = null;

onMounted(() => {
  loadTemplate();
  refreshAll();

  // 定时刷新监控器，用于展现 TTL 过期失效的实时渲染效果
  monitorTimer = setInterval(refreshAll, 1000);

  // 监听 storage 事件实现多标签页改变时状态更新
  window.addEventListener("storage", refreshLocal);
});

onUnmounted(() => {
  if (monitorTimer) clearInterval(monitorTimer);
  if (typeof window !== "undefined") {
    window.removeEventListener("storage", refreshLocal);
  }
});
</script>

<style scoped>
.storage-playground {
  font-family: var(--vp-font-family-base);
  color: var(--vp-c-text-1);
}

.control-bar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1.25rem;
  background-color: var(--vp-c-bg-mute);
  padding: 0.75rem 1rem;
  border-radius: 8px;
  border: 1px solid var(--vp-c-divider);
}

.control-label {
  font-weight: 600;
  font-size: 0.9rem;
}

.template-dropdown {
  padding: 0.35rem 0.75rem;
  border-radius: 6px;
  border: 1px solid var(--vp-c-divider);
  background-color: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-weight: 500;
  outline: none;
  cursor: pointer;
}

.playground-layout {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 1.5rem;
}

@media (max-width: 960px) {
  .playground-layout {
    grid-template-columns: 1fr;
  }
}

.section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: 600;
  font-size: 1.1rem;
  margin-bottom: 0.75rem;
}

.btn {
  padding: 0.35rem 0.85rem;
  border-radius: 6px;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
  border: none;
  transition: opacity 0.2s;
}

.btn:hover {
  opacity: 0.9;
}

.btn-run {
  background-color: var(--vp-c-brand-1);
  color: white;
}

.btn-reset {
  background-color: var(--vp-c-bg-mute);
  color: var(--vp-c-text-1);
  border: 1px solid var(--vp-c-divider);
}

.btn-gc {
  background-color: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
  border: 1px solid var(--vp-c-brand-1);
}

.code-container {
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  overflow: hidden;
  background-color: #1e1e2e;
}

.code-textarea {
  width: 100%;
  padding: 0.75rem;
  border: none;
  background-color: transparent;
  color: #cdd6f4;
  font-family: var(--vp-font-family-mono);
  font-size: 0.85rem;
  line-height: 1.5;
  resize: vertical;
  outline: none;
}

.console-title {
  font-weight: 600;
  font-size: 0.9rem;
  margin-top: 1.25rem;
  margin-bottom: 0.5rem;
}

.console-box {
  background-color: #11111b;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 0.75rem;
  font-family: var(--vp-font-family-mono);
  font-size: 0.8rem;
  min-height: 120px;
  max-height: 240px;
  overflow-y: auto;
}

.console-placeholder {
  color: var(--vp-c-text-3);
  font-style: italic;
}

.console-line {
  color: #a6e3a1;
  white-space: pre-wrap;
  margin-bottom: 0.25rem;
  line-height: 1.4;
}

.console-line.line-error {
  color: #f38ba8;
}

/* 监控器区域 */
.monitor-card {
  background-color: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  margin-bottom: 1rem;
  overflow: hidden;
}

.card-header {
  background-color: var(--vp-c-bg-mute);
  padding: 0.5rem 0.75rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--vp-c-divider);
}

.card-badge {
  font-size: 0.75rem;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
  color: white;
}

.local-badge {
  background-color: #3b82f6;
}
.cookie-badge {
  background-color: #ec4899;
}
.idb-badge {
  background-color: #10b981;
}

.card-desc {
  font-size: 0.75rem;
  color: var(--vp-c-text-2);
}

.card-body {
  padding: 0.75rem;
  max-height: 250px;
  overflow-y: auto;
}

.item-empty {
  font-size: 0.8rem;
  color: var(--vp-c-text-3);
  text-align: center;
  padding: 1rem 0;
  font-style: italic;
}

.storage-item {
  border-bottom: 1px dashed var(--vp-c-divider);
  padding-bottom: 0.5rem;
  margin-bottom: 0.5rem;
}

.storage-item:last-child {
  border-bottom: none;
  padding-bottom: 0;
  margin-bottom: 0;
}

.item-meta {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 0.25rem;
}

.item-key {
  font-weight: 700;
  font-size: 0.85rem;
  color: var(--vp-c-brand-1);
}

.item-raw-key {
  font-size: 0.7rem;
  color: var(--vp-c-text-3);
}

.item-data {
  font-size: 0.75rem;
  margin-bottom: 0.35rem;
  background-color: var(--vp-c-bg-mute);
  padding: 0.35rem 0.5rem;
  border-radius: 4px;
}

.data-row {
  margin-bottom: 2px;
}

.text-sig {
  color: var(--vp-c-text-3);
}

.text-expired {
  color: #ef4444;
  font-weight: bold;
  animation: pulse 1s infinite alternate;
}

@keyframes pulse {
  from {
    opacity: 0.7;
  }
  to {
    opacity: 1;
  }
}

.btn-tamper {
  font-size: 0.7rem;
  background-color: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.3);
  padding: 2px 6px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-tamper:hover {
  background-color: rgba(239, 68, 68, 0.2);
}
</style>
