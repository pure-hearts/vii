# 技术设计 (Technical Design) - 更新 GitHub 镜像源并检测可用性

## 1. 架构方案 (Architecture)

整体设计包含三个核心部分：

1. **配置层**：更新 `BUILTIN_MIRRORS` 包含 5 个内置加速源/代理，支持多样化的代理结构。
2. **URL 转换层**：扩展 `applyGithubMirror`，使其能够支持诸如 `gitclone.com`、`gh-proxy` 类前缀代理以及 `Gitee极速下载` 这种特殊的地址替换规则。
3. **检测与非代理测速层**：
   - 临时剥离环境变量中的代理参数。
   - 构造目标仓库（如 `vuejs/vue`）的 Git 探测接口（`info/refs?service=git-upload-pack`）。
   - 进行直连 `fetch`，测定延迟和状态。

---

## 2. 详细设计 (Detailed Design)

### 2.1 镜像配置扩展 (`packages/cli/src/utils/config.ts`)

我们将重构 `BUILTIN_MIRRORS`：

```typescript
export const BUILTIN_MIRRORS: MirrorConfig[] = [
  { name: "GitHub", value: "https://github.com", isBuiltin: true },
  { name: "GitClone", value: "https://gitclone.com", isBuiltin: true },
  { name: "GHProxy", value: "https://gh-proxy.com", isBuiltin: true },
  { name: "Akams", value: "https://github.akams.cn", isBuiltin: true },
  { name: "GHFast", value: "https://ghfast.top", isBuiltin: true },
  { name: "Gitee", value: "https://gitee.com/mirrors", isBuiltin: true },
];
```

### 2.2 转换逻辑重构 (`packages/cli/src/scaffold/download.ts`)

为了支持前缀类代理和 Gitee，需要重构 `applyGithubMirror`。
提取原始 URL 中的 `{owner}` 和 `{repo}`。
例如，将 `https://github.com/vuejs/vue.git` 规范化提取为 `owner: "vuejs"`, `repo: "vue"`。

转换匹配：

- **GitClone** -> `https://gitclone.com/github.com/{owner}/{repo}.git`
- **Gitee** -> `https://gitee.com/mirrors/{repo}.git` (注意：Gitee 极速下载仅镜像公共的热门项目，其 repo 必须是原 GitHub 的 repo 名，owner 被替换为 `mirrors`)
- **前缀代理（gh-proxy, akams, ghfast）** -> `https://{domain}/https://github.com/{owner}/{repo}.git`
- **常规域名替换（如 kkgithub.com / 自定义镜像）** -> 保持原来的行为（直接替换域名）

### 2.3 屏蔽代理与精准 Git 协议检测 (`packages/cli/src/prompts/mirror.ts`)

1. **直连探测（测试时不要使用代理）**：
   在 `testLatency` 的首部，通过代码强制忽略或清除系统代理：

   ```typescript
   // 备份当前的代理环境变量
   const backupEnv = {
     http_proxy: process.env.http_proxy,
     https_proxy: process.env.https_proxy,
     HTTP_PROXY: process.env.HTTP_PROXY,
     HTTPS_PROXY: process.env.HTTPS_PROXY,
     all_proxy: process.env.all_proxy,
     ALL_PROXY: process.env.ALL_PROXY,
   };

   // 临时删除它们，确保请求绝对直连
   delete process.env.http_proxy;
   delete process.env.https_proxy;
   delete process.env.HTTP_PROXY;
   delete process.env.HTTPS_PROXY;
   delete process.env.all_proxy;
   delete process.env.ALL_PROXY;

   try {
     // 执行直连探测
   } finally {
     // 恢复环境变量，防止对其他生命周期产生副作用
     Object.assign(process.env, backupEnv);
   }
   ```

2. **探测具体仓库（以 `vuejs/vue` 为例）**：
   `testLatency` 接口设计变更：
   ```typescript
   export async function testLatency(
     mirrorUrl: string,
     targetGitUrl: string = "https://github.com/vuejs/vue.git",
   ): Promise<number>;
   ```
   在进行连接时，不再测试镜像站的根目录（HEAD `/`），而是向转换后的 Git url 发送 `GET` 或 `HEAD` 请求，地址为：
   `${convertedUrl}/info/refs?service=git-upload-pack`
   - 原因：这能够反映该镜像是否确实能拉取此仓库。部分镜像可能因网络策略、只读、权限或某些代理网站只代理静态页面而无法访问此端点。
   - 超时设置：1.5 ~ 2 秒。

---

## 3. 兼容性与边界情况 (Compatibility & Boundary Cases)

1. **Gitee 极速下载的非全量镜像特性**：
   Gitee 极速下载（`https://gitee.com/mirrors`）只针对热门开源仓库。
   如果用户请求克隆一个非热门的自定义仓库（例如 `github:vfiee/project-boilerplate`），Gitee mirrors 大概率不存在该镜像，导致 `git-upload-pack` 返回 404。
   通过精确探测 `${convertedUrl}/info/refs?service=git-upload-pack`，我们能直接检测到 404 并判定其“不可达/超时”，从而优雅屏蔽，只在适合的仓库（如 `vuejs/vue`）中将其作为可用推荐。

2. **测试用例 mock 隔离**：
   在单元测试中，我们会对 `fetch` 发送的请求进行 mock，防止网络测试在没有真实网络环境下报错，确保本地 `pnpm test` 持续集成能够通过。
