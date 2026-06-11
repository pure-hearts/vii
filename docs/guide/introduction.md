# 什么是 VII？

**VII Toolchain** 是一套专注于提升前端研发工程效率与客户端运行时鲁棒性的整合工具链解决方案。它旨在通过**极致轻量、高阶防呆、开箱即用**的设计，解决项目初始化慢、版本发布繁琐及多引擎本地存储杂乱等日常痛点。

---

## 核心设计理念

### 1. 渐进式与极致轻量 (Progressive & Lightweight)

我们坚持将核心依赖降至最低，并通过 **子路径导出 (Subpath Exports)** 进行插件式解耦。例如，在 `@vyron/storage` 中，Cookie 与 IndexedDB 驱动不包含在同步打包核心内，仅在开发者按需导入时才会加载，从而实现极小的运行时打包体积（核心库仅 35kB 左右）。

### 2. 人性化防呆机制 (Failsafe & Defensive Design)

我们认为开发工具不仅是“实现功能”，更应该在用户拼写错误、配额超限或操作不当时提供安全网：

- **CLI**：基于编辑距离算法计算指令相似度，在拼错时（如 `releas`）智能推荐相似指令；
- **Release**：发生网络波动或上传错误时，自动将本地 `package.json` 中的版本号和 Git Tag 还原，避免产生“半发布”脏版本；
- **Storage**：批量操作在单键物理超载时支持物理回滚，且在同步接口调用异步驱动（如 IndexedDB）时提供拦截阻断，防患未然。

---

## 模块全景图

```mermaid
graph TD
    A[VII Toolchain] --> B[@vyron/cli]
    A --> C[@vyron/release]
    A --> D[@vyron/storage]

    B --> B1[项目脚手架初始化]
    B --> B2[并发非代理测速 GitHub 镜像]
    B --> B3[智能拼写容错]

    C --> C1[交互式多包升级]
    C --> C2[CHANGELOG / Release Note 自动生成]
    C --> C3[版本回滚与 Dry Run]

    D --> D1[前后缀命名空间安全隔离]
    D --> D2[TTL 过期失效管理与 GC]
    D --> D3[防篡改数据完整性签名]
    D --> D4[跨标签实例 BroadcastChannel 同步]
```

## 下一步

接下来，您可以阅读 [快速开始](./quick-start) 了解如何将 VII 应用到您的日常开发流程中。
