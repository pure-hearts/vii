# 执行计划 (Execution Plan) - 更新 GitHub 镜像源并检测可用性

## 1. 任务拆解与开发顺序

本任务按照依赖从低到高的顺序执行：

1. **配置层变更**：更新内置镜像源列表。
2. **逻辑层重构**：实现 `applyGithubMirror` 中对 5 种不同类型镜像/代理的 URL 解析与拼装逻辑。
3. **测速层重构**：重构 `testLatency`，使其针对具体仓库并在直连（排除系统代理环境变量）下进行握手探测。
4. **命令层支持**：优化 `vii speed` 输出，并在 `promptMirror` 触发的自动测速中适配这一新逻辑。
5. **单元测试编写**：增加/更新单元测试，覆盖 5 种代理的转换规则，以及直连探测功能。

---

## 2. 检查清单 (Checklist)

- [ ] **步骤 1: 更新 BUILTIN_MIRRORS 配置**
  - 修改 `packages/cli/src/utils/config.ts` 中的 `BUILTIN_MIRRORS`，增加：
    - `GitClone` (`https://gitclone.com`)
    - `GHProxy` (`https://gh-proxy.com`)
    - `Akams` (`https://github.akams.cn`)
    - `GHFast` (`https://ghfast.top`)
    - `Gitee` (`https://gitee.com/mirrors`)

- [ ] **步骤 2: 实现复杂的 URL 镜像转换规则**
  - 在 `packages/cli/src/scaffold/download.ts` 中修改 `applyGithubMirror`：
    - 规范提取 `github.com` 的 `owner` 和 `repo`（如 `vuejs/vue`）。
    - 针对 `gitclone.com` 组装：`https://gitclone.com/github.com/{owner}/{repo}.git`
    - 针对 `gitee.com/mirrors` 组装：`https://gitee.com/mirrors/{repo}.git`
    - 针对 `gh-proxy.com`, `github.akams.cn`, `ghfast.top` 组装前缀：`https://{mirrorHost}/https://github.com/{owner}/{repo}.git`
    - 保留对其他标准域名的替换降级规则。
  - 在 `packages/cli/src/scaffold/download.ts` 中微调 `getMirrorName` 辅助函数。

- [ ] **步骤 3: 重构测速逻辑（排除代理，探测具体仓库）**
  - 在 `packages/cli/src/prompts/mirror.ts` 中重构 `testLatency`：
    - 增加第二个可选参数 `targetGitUrl: string = "https://github.com/vuejs/vue.git"`。
    - 探测前备份并删除环境变量中的 `http_proxy`、`https_proxy` 等。
    - 转换得到代理后的 Git URL。
    - 拼接 `/info/refs?service=git-upload-pack` 作为 `detectUrl`。
    - 发送 `fetch` 请求（不设代理），记录往返耗时（RTT）。
    - 返回延迟或 `-1`（超时/异常）。
    - `finally` 中还原环境变量。

- [ ] **步骤 4: 更新单元测试**
  - 增加或更新 `packages/cli/test/download.test.ts` 中对 `applyGithubMirror` 转换逻辑的测试。
  - 更新 `packages/cli/test/mirror-command.test.ts`，支持测试新逻辑，使用 mock 阻止真实网络请求发出。

---

## 3. 验证命令 (Verification)

- 运行单元测试验证功能：
  ```bash
  pnpm --filter @vyron/cli test
  ```
- 手动验证：
  - 打开代理（如 `export https_proxy=http://127.0.0.1:7890`），然后运行 `vii speed`。
  - 观察打印结果，并验证它是否成功检测了 `https://github.com/vuejs/vue.git` 针对 5 个镜像的直连延迟，而不是走代理测试的结果。
