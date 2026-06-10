# Quality Guidelines in @vyron/cli

> Code standards, validation rules, and forbidden patterns.

---

## Code Standards

To keep the CLI zero-dependency outside `prompts`, the following quality standards are enforced:

- **No heavy CLI parsers**: Use direct positional argument parsing in `register.ts` using whitelist logic. Do not install heavy argument parsers like commander or yargs.
- **Strict Whitelists**: Reject all unrecognized options and command inputs.
- **Fuzzy Autocorrection**: Use the `getEditDistance` edit distance algorithm to detect close typos for known subcommands (`init`, `create`, `release`, `list`) and recommend the correct commands.
- **Scaffold Isolation**: Never copy template `.git` metadata directories to new project target folders. Keep template directory cleanups inside `finally` blocks in `download.ts`.

---

## GitHub Mirror Extension Pattern

### Convention: 新增镜像源必须声明 `cloneStyle`

**What**: 每个内置镜像在 `BUILTIN_MIRRORS`（`config.ts`）中必须声明 `cloneStyle` 字段，
由 `applyGithubMirror`（`download.ts`）读取后决定 URL 拼接方式。

**四种风格说明**:

| `cloneStyle` | 适用场景                     | 转换示例                                             |
| ------------ | ---------------------------- | ---------------------------------------------------- |
| `"domain"`   | 直接域名替换（默认）         | `kkgithub.com/owner/repo.git`                        |
| `"gitclone"` | gitclone.com 特殊格式        | `gitclone.com/github.com/owner/repo.git`             |
| `"prefix"`   | 前缀代理（gh-proxy 等）      | `gh-proxy.com/https://github.com/owner/repo.git`     |
| `"gitee"`    | Gitee 极速下载（仅热门仓库） | `gitee.com/mirrors/repo.git`（owner 固定为 mirrors） |

**Why**: 不同代理服务对 GitHub 仓库的 URL 格式要求不同。统一用 `cloneStyle` 字段驱动，避免在转换函数里堆砌硬编码的 `includes("xxx.com")` 判断。

**Example**:

```typescript
// config.ts — 正确：新增镜像时声明风格
{ name: "MyProxy", value: "https://myproxy.example.com", isBuiltin: true, cloneStyle: "prefix" }

// download.ts 会按 "prefix" 风格拼接：
// https://myproxy.example.com/https://github.com/owner/repo.git
```

**Extensibility**: 新增风格时，在 `MirrorCloneStyle`（config.ts）添加字面量，
在 `applyGithubMirror`（download.ts）增加对应的 `if (style === "xxx")` 分支，无需修改其他代码。

---

### Convention: 镜像可用性探测必须直连且针对具体仓库

**What**: `testLatency`（`prompts/mirror.ts`）的探测规范：

1. **清除代理环境变量**：探测前备份并删除 `http_proxy` / `https_proxy` / `HTTP_PROXY` / `HTTPS_PROXY` / `all_proxy` 等变量，`finally` 中还原，确保直连。
2. **探测 Git 协议端点**：不对域名根目录发 `HEAD`，而是请求 `${convertedGitUrl}/info/refs?service=git-upload-pack`，返回 HTTP 200 才算可用。
3. **使用具体参照仓库**：默认用 `https://github.com/vuejs/vue.git`（热门项目，多数镜像均有缓存）。
4. **超时 2 秒**。

**Why**: 部分镜像域名本身可访问，但不支持目标仓库的 Git 协议（如 Gitee 只镜像热门仓库、gitclone.com 返回 502）。只有协议级探测才能真实反映克隆能力。

**Wrong**:

```typescript
// ❌ 只测域名是否存活，无法判断 Git 克隆能否成功
const res = await fetch(mirrorBaseUrl, { method: "HEAD" });
return res.ok ? Date.now() - start : -1;
```

**Correct**:

```typescript
// ✅ 测具体仓库的 Git 协议端点，直连（已清除代理环境变量）
const detectUrl = `${convertedGitUrl.replace(/\.git$/, "")}/info/refs?service=git-upload-pack`;
const res = await fetch(detectUrl, { method: "GET", signal: controller.signal });
return res.ok ? Date.now() - start : -1;
```

---

## Testing Verification

Every newly added CLI command or argument validation logic must have a corresponding integration test in `test/register.test.ts` mock files.

- Mock all filesystem changes, commands action, and `process.exit` functions to maintain fast unit test cycles.
- Project test code formatting must be verified via `pnpm run lint` (`vp check`).
