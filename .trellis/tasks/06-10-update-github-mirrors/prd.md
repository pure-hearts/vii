# 更新 GitHub 镜像源并检测可用性 (以 vuejs/vue 为例)

## 目标 (Goal)

扩展 `vii` 的 GitHub 镜像加速机制，支持更多国内常用的 GitHub 代理和镜像源。实现一个健壮的可用性与延迟检测机制，测试时**强制不使用任何代理（直连网络）**，完全复现国内真实的直连网络环境。以 `https://github.com/vuejs/vue.git` 仓库为例，能够精准检测并筛选出当前最快、可用的镜像源。

## 需求 (Requirements)

1. **镜像/代理列表扩展**：
   在内置镜像源列表中，新增并支持以下 5 个加速源（包含各自的克隆 URL 转换规则）：
   - `gitclone.com`：
     - 克隆用法：`https://gitclone.com/github.com/{owner}/{repo}.git`
     - 适用场景：专门的缓存加速，适合公开仓库。
   - `gh-proxy.com`：
     - 克隆用法：`https://gh-proxy.com/https://github.com/{owner}/{repo}.git`
     - 适用场景：通用 GitHub 代理。
   - `github.akams.cn`：
     - 克隆用法：`https://github.akams.cn/https://github.com/{owner}/{repo}.git`
     - 适用场景：通用代理，支持 Release、Clone、Raw 等。
   - `ghfast.top`：
     - 克隆用法：`https://ghfast.top/https://github.com/{owner}/{repo}.git`
     - 适用场景：通用代理，备用，支持配合 Token 克隆私有仓库。
   - `Gitee 极速下载`：
     - 克隆用法：`https://gitee.com/mirrors/{repo}.git` （如 `vuejs/vue` -> `https://gitee.com/mirrors/vue.git`。注意：Gitee Mirrors 的 repo 名为 GitHub 仓库名，owner 统一为 mirrors，且仅适用于 Gitee 镜像了的热门仓库）。

2. **镜像克隆 URL 转换规则实现**：
   重构 `applyGithubMirror` 函数，能根据所选的镜像源类型，正确拼接和转换原始 GitHub URL。特别是对于 `Gitee`、`gitclone.com` 等具有特殊格式的源，进行深度解析（如提取 `owner` 和 `repo` 字段）。

3. **直连检测与排除代理环境变量**：
   - **清除代理**：在执行延迟与可用性检测（使用 `fetch` 探测）以及执行 `git clone` 探测时，必须**在代码中主动清除或屏蔽系统代理环境变量**（如 `HTTP_PROXY`、`HTTPS_PROXY`、`http_proxy`、`https_proxy`，以及清除 `git -c http.proxy=""` 的本地代理设置），完全复现真实的国内直连网络环境。

4. **特定仓库可用性与精确延迟检测**：
   - 不仅检测镜像域名本身的存活，而且必须针对目标仓库（如 `https://github.com/vuejs/vue.git`）进行 Git 协议可用性检测。
   - 检测方法：对每个镜像源转换后的 Git 仓库地址，向其 `info/refs?service=git-upload-pack` 发起 HTTP 请求进行探测。
     - 例如，对于 `gitclone.com`，请求 `https://gitclone.com/github.com/vuejs/vue.git/info/refs?service=git-upload-pack`
     - 对于 `Gitee 极速下载`，请求 `https://gitee.com/mirrors/vue.git/info/refs?service=git-upload-pack`
     - 如果返回状态码 `200`，说明该代理/镜像对该仓库可用。
     - 统计该请求的响应耗时（RTT）作为该镜像的实际克隆延迟。
     - 超时时间设为 `2.0 秒`。

5. **`vii speed` 命令行工具集成**：
   - 优化或重构现有的 `vii speed` 命令行逻辑，当执行检测时，用户可以指定或默认使用 `https://github.com/vuejs/vue.git` 作为测试仓库。
   - 终端以列表形式输出各镜像的直连延迟与可用状态，高亮推荐最快的源。

## 验收标准 (Acceptance Criteria)

- [ ] **转换正确性**：实现上述 5 种镜像的 URL 拼接转换，且单元测试覆盖所有的转换规则（包括 Gitee, gitclone.com, gh-proxy 等）。
- [ ] **直连探测（无代理）**：在检测延迟与执行 Git 克隆探测时，代码清除了环境变量中的代理参数。
- [ ] **Git 协议级别检测**：延迟与可用性检测通过请求 `${mirrorUrl}/info/refs?service=git-upload-pack` 实现，而非仅仅 HEAD 域名根目录，以保证代理对目标仓库（以 `vuejs/vue` 为例）真实可用。
- [ ] **交互式反馈**：运行 `vii speed` 时，能够在不走代理的直连状态下，精准列出 5 个镜像源针对 `https://github.com/vuejs/vue.git` 的延迟，输出包含“可用/超时/最快推荐”的清晰面板。
- [ ] **测试通过**：单元测试和集成测试 100% 通过。
