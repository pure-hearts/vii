<template>
  <div class="storage-playground">
    <!-- 控制面板：模板选择 -->
    <div class="control-bar">
      <label for="template-select" class="control-label">{{
        isEn ? "Select Template:" : "选择示例模板："
      }}</label>
      <select
        id="template-select"
        v-model="selectedTemplate"
        @change="loadTemplate"
        class="template-dropdown"
      >
        <option value="basic">
          {{ isEn ? "1. Basic CRUD & Nested Property" : "1. 基础读写与嵌套路径获取" }}
        </option>
        <option value="ttl">
          {{ isEn ? "2. Expiration Control (TTL) & GC" : "2. 过期时长控制 (TTL) 与 GC" }}
        </option>
        <option value="integrity">
          {{ isEn ? "3. Integrity Salted Signature" : "3. 防篡改完整性签名指纹" }}
        </option>
        <option value="async">
          {{
            isEn ? "4. Async IndexedDB & API Collision Guard" : "4. 异步 IndexedDB 与 API 冲突拦截"
          }}
        </option>
      </select>
    </div>

    <div class="playground-layout">
      <!-- 左侧：代码编辑与运行、控制台输出 -->
      <div class="editor-section">
        <div class="section-title">
          <span>📝 {{ isEn ? "Code Editor" : "代码编辑区" }}</span>
          <div class="button-group">
            <button @click="executeCode" class="btn btn-run">
              ⚡ {{ isEn ? "Run Code" : "运行代码" }}
            </button>
            <button @click="resetCode" class="btn btn-reset">{{ isEn ? "Reset" : "重置" }}</button>
          </div>
        </div>
        <div class="code-container">
          <textarea
            v-model="code"
            class="code-textarea"
            :placeholder="
              isEn
                ? 'Type or edit JavaScript code here...'
                : '在此输入或编辑您的 JavaScript 代码...'
            "
            rows="12"
          ></textarea>
        </div>

        <div class="console-title">🖥️ {{ isEn ? "Execution Log Console" : "运行日志控制台" }}</div>
        <div class="console-box">
          <div v-if="logs.length === 0" class="console-placeholder">
            {{ isEn ? "Waiting for run..." : "等待代码运行..." }}
          </div>
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
          <span>📊 {{ isEn ? "Real-time Storage Monitor" : "物理介质状态监测器" }}</span>
          <button @click="triggerGC" class="btn btn-gc">
            🧹 {{ isEn ? "Run GC" : "运行垃圾回收 (GC)" }}
          </button>
        </div>

        <!-- LocalStorage 监视卡片 -->
        <div class="monitor-card">
          <div class="card-header">
            <span class="card-badge local-badge">LocalStorage</span>
            <span class="card-desc"
              >{{ isEn ? "Prefix:" : "物理前缀:" }} <code>playground_</code></span
            >
          </div>
          <div class="card-body">
            <div v-if="localItems.length === 0" class="item-empty">
              {{
                isEn
                  ? "No LocalStorage records (prefixed playground_)"
                  : "无相关数据 (以 playground_ 开头)"
              }}
            </div>
            <div v-for="item in localItems" :key="item.key" class="storage-item">
              <div class="item-meta">
                <span class="item-key">{{ item.logicalKey }}</span>
                <span class="item-raw-key"
                  >{{ isEn ? "Physical Key:" : "物理键:" }} {{ item.key }}</span
                >
              </div>
              <div class="item-data">
                <div class="data-row">
                  <strong>{{ isEn ? "Value:" : "值:" }}</strong> <code>{{ item.val }}</code>
                </div>
                <div v-if="item.expire" class="data-row">
                  <strong>{{ isEn ? "Expires:" : "过期时间:" }}</strong>
                  <span :class="{ 'text-expired': item.isExpired }">
                    {{ formatTime(item.expire) }} ({{
                      item.isExpired ? (isEn ? "Expired" : "已过期") : isEn ? "Valid" : "未过期"
                    }})
                  </span>
                </div>
                <div v-if="item.signature" class="data-row text-sig">
                  <strong>{{ isEn ? "Signature:" : "防篡改签名:" }}</strong>
                  <code>{{ item.signature.slice(0, 10) }}...</code>
                </div>
              </div>
              <div class="item-actions">
                <button @click="tamperItem('local', item.key)" class="btn-tamper">
                  ⚠️ {{ isEn ? "Tamper Physical Value" : "篡改该物理数据" }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Cookie 监视卡片 -->
        <div class="monitor-card">
          <div class="card-header">
            <span class="card-badge cookie-badge">Cookie</span>
            <span class="card-desc"
              >{{ isEn ? "Prefix:" : "物理前缀:" }} <code>playground_</code></span
            >
          </div>
          <div class="card-body">
            <div v-if="cookieItems.length === 0" class="item-empty">
              {{ isEn ? "No related Cookies found" : "无相关 Cookie 数据" }}
            </div>
            <div v-for="item in cookieItems" :key="item.key" class="storage-item">
              <div class="item-meta">
                <span class="item-key">{{ item.logicalKey }}</span>
                <span class="item-raw-key"
                  >{{ isEn ? "Physical Cookie:" : "物理 Cookie:" }} {{ item.key }}</span
                >
              </div>
              <div class="item-data">
                <div class="data-row">
                  <strong>{{ isEn ? "Value:" : "值:" }}</strong> <code>{{ item.val }}</code>
                </div>
              </div>
              <div class="item-actions">
                <button @click="tamperItem('cookie', item.key)" class="btn-tamper">
                  ⚠️ {{ isEn ? "Tamper Physical Value" : "篡改该物理数据" }}
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
              >Db: <code>playground_db</code> Store: <code>playground_store</code></span
            >
          </div>
          <div class="card-body">
            <div v-if="idbItems.length === 0" class="item-empty">
              {{ isEn ? "No database records found" : "无相关数据库数据" }}
            </div>
            <div v-for="item in idbItems" :key="item.key" class="storage-item">
              <div class="item-meta">
                <span class="item-key">{{ item.key }}</span>
              </div>
              <div class="item-data">
                <div class="data-row">
                  <strong>{{ isEn ? "Value:" : "值:" }}</strong> <code>{{ item.val }}</code>
                </div>
                <div v-if="item.expire" class="data-row">
                  <strong>{{ isEn ? "Expires:" : "过期时间:" }}</strong>
                  <span :class="{ 'text-expired': item.isExpired }">
                    {{ formatTime(item.expire) }}
                  </span>
                </div>
              </div>
              <div class="item-actions">
                <button @click="tamperItem('idb', item.key)" class="btn-tamper">
                  ⚠️ {{ isEn ? "Tamper Physical Value" : "篡改该物理数据" }}
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
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useData } from "vitepress";
import { createStorage } from "@vyron/storage";
import {
  CookieStorageDriver,
  IndexedDBStorageDriver,
  MemoryStorageDriver,
} from "@vyron/storage/drivers";

const { lang } = useData();
const isEn = computed(() => lang.value === "en-US");

const selectedTemplate = ref("basic");
const code = ref("");
const logs = ref([]);
const localItems = ref([]);
const cookieItems = ref([]);
const idbItems = ref([]);

// 预设模板配置，根据当前语言动态输出注释与内容
const getTemplates = () => ({
  basic: isEn.value
    ? `// 1. Initialize LocalStorage driver, set namespace prefix to playground_
const local = createStorage('local', { prefix: 'playground_' });

// 2. Set nested object structure in storage
local.set('user_config', {
  theme: 'dark',
  user: { name: 'Vyron', roles: ['admin', 'developer'] }
});

console.log('✅ Successfully wrote nested structure user_config');

// 3. Securely resolve properties via lodash-style path syntax
const theme = local.get('user_config', 'theme');
const name = local.get('user_config', 'user.name');
const role = local.get('user_config', 'user.roles[0]');

console.log('Theme resolved:', theme);
console.log('User name resolved:', name);
console.log('First user role resolved:', role);

// 4. Safely fall back to default values for missing paths
const age = local.get('user_config', 'user.profile.age', 18);
console.log('Default fallback value for age:', age);`
    : `// 1. 初始化 LocalStorage 驱动实例，设定命名空间为 playground_
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

  ttl: isEn.value
    ? `// 1. Create storage instance with default 3 seconds (3000ms) TTL
const store = createStorage('local', {
  prefix: 'playground_',
  expire: 3000 // default TTL
});

// 2. Write item using global default TTL (3s)
store.set('temp_token', 'token_xyz_123');

// 3. Overwrite default TTL, set to persistent (null)
store.set('persist_data', 'important_information', null);

// 4. Overwrite default TTL, set to expire in 1s (1000ms)
store.set('short_item', 'expired_quickly', 1000);

console.log('✅ Values successfully written.');
console.log('Please observe the cards on the right side over the next 1-3 seconds.');
console.log('Initial temp_token:', store.get('temp_token'));
console.log('Initial short_item:', store.get('short_item'));`
    : `// 1. 创建默认 3 秒过期的 LocalStorage 存储实例
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

  integrity: isEn.value
    ? `// 1. Create a secure storage instance with signature verification
const secureStore = createStorage('local', {
  prefix: 'playground_',
  integrity: true, // Enable anti-tampering checksum signature
  secretSalt: 'PLAYGROUND_SALT_KEY' // Salt key
});

// 2. Set initial value
secureStore.set('game_coins', { count: 50 });
console.log('✅ Secured value game_coins has been set.');
console.log('Initial read value:', secureStore.get('game_coins'));

console.log('\\n👉 Click "Tamper Physical Value" on the right LocalStorage card.');
console.log('Then click [⚡ Run Code] again to execute this block and view checksum protection.');

// 3. Read step will auto-verify the physical signature
// const coins = secureStore.get('game_coins');
// console.log('Read game_coins after tampering:', coins);`
    : `// 1. 创建具备防篡改完整性校验的存储包装器
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

  async: isEn.value
    ? `// 1. Instantiate an asynchronous IndexedDB driver
const db = createStorage(new IndexedDBStorageDriver('playground_db', 'playground_store'));

// 2. Purely async drivers require *Async methods.
console.log('Writing async data to database...');
await db.setAsync('async_info', { title: 'IndexedDB cache', vol: '100MB' });

const result = await db.getAsync('async_info');
console.log('✅ Successfully read from IndexedDB:', result);

// 3. Bad path: trying to call synchronous APIs on async drivers will crash safely:
try {
  console.log('Attempting synchronous get()...');
  db.get('async_info');
} catch (err) {
  console.log('❌ Caught API Collision error:', err.message);
}`
    : `// 1. 实例化 IndexedDB 异步驱动底座
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
});

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
      (isEn.value ? "❌ Error: " : "❌ 错误: ") +
        args
          .map((arg) => (typeof arg === "object" ? JSON.stringify(arg, null, 2) : String(arg)))
          .join(" "),
    );
  },
};

const loadTemplate = () => {
  const t = getTemplates();
  code.value = t[selectedTemplate.value] || "";
};

const resetCode = () => {
  loadTemplate();
  logs.value = [];
};

// 监听语言变化以动态切换编辑器模板
onMounted(() => {
  loadTemplate();
});
watch(isEn, () => {
  loadTemplate();
});

// 模拟动态代码执行
const executeCode = async () => {
  logs.value = [];
  try {
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
        if (parsed && "value" in parsed) {
          val = JSON.stringify(parsed.value);
          expire = parsed.expire;
          signature = parsed.signature;
          if (expire && now > expire) {
            isExpired = true;
          }
        }
      } catch (e) {}

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
    const local = createStorage("local", { prefix: "playground_" });
    local.runGC();
    logs.value.push(
      isEn.value
        ? "🧹 Manually triggered GC clean-up sweep!"
        : "🧹 已手动执行 GC 扫描清理过期物理数据！",
    );
    refreshAll();
  } catch (e) {
    mockConsole.error("GC error: " + e.message);
  }
};

// 物理篡改数据
const tamperItem = (type, key) => {
  if (type === "local") {
    const raw = localStorage.getItem(key);
    try {
      const parsed = JSON.parse(raw);
      if (parsed && "value" in parsed) {
        if (typeof parsed.value === "object") {
          parsed.value.count = (parsed.value.count || 0) + 9999999;
          parsed.value.amount = 9999999;
        } else {
          parsed.value = "HACKED_VALUE";
        }
        localStorage.setItem(key, JSON.stringify(parsed));
        logs.value.push(
          isEn.value
            ? `⚠️ [Hack Simulate] Physical edit of LocalStorage [${key}] to: ${JSON.stringify(parsed)}`
            : `⚠️ [黑客模拟] 物理修改 LocalStorage [${key}] 的内容为：${JSON.stringify(parsed)}`,
        );
      } else {
        localStorage.setItem(key, "HACKED");
      }
    } catch (e) {
      localStorage.setItem(key, "HACKED_RAW_VALUE");
    }
  } else if (type === "cookie") {
    document.cookie = `${key}=HACKED_COOKIE_VALUE; path=/`;
    logs.value.push(
      isEn.value
        ? `⚠️ [Hack Simulate] Physically modified Cookie [${key}] to HACKED_COOKIE_VALUE`
        : `⚠️ [黑客模拟] 物理修改 Cookie [${key}] 的值为 HACKED_COOKIE_VALUE`,
    );
  } else if (type === "idb") {
    try {
      const dbRequest = window.indexedDB.open("playground_db");
      dbRequest.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction(["playground_store"], "readwrite");
        const objectStore = transaction.objectStore("playground_store");
        objectStore.put("HACKED_INDEXEDDB_VALUE", key).onsuccess = () => {
          logs.value.push(
            isEn.value
              ? `⚠️ [Hack Simulate] Physically modified IndexedDB key [${key}] to HACKED_INDEXEDDB_VALUE`
              : `⚠️ [黑客模拟] 物理修改 IndexedDB 表键 [${key}] 为 HACKED_INDEXEDDB_VALUE`,
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
  refreshAll();
  monitorTimer = setInterval(refreshAll, 1000);
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
