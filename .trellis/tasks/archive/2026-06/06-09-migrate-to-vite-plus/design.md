# Technical Design - Migrate to vite-plus

## Architecture & Tooling Selection

我们需要将原有的构建配置设计映射为 `vite-plus` 的配置规范：

1. **`packages/utils` 配置方案**：
   - 之前使用 `unbuild` 编译成 `esm` (mjs) + `cjs` (cjs) 并进行压缩和类型声明生成。
   - 对应 `vite-plus` 配置：

     ```typescript
     import { defineConfig } from "vite-plus";

     export default defineConfig({
       pack: {
         entry: ["src/index.ts"],
         format: ["esm", "cjs"],
         dts: true,
         minify: true,
       },
     });
     ```

2. **`packages/release` 配置方案**：
   - 之前为编译成 `esm` 并生成类型声明文件。
   - 对应 `vite-plus` 配置：

     ```typescript
     import { defineConfig } from "vite-plus";

     export default defineConfig({
       pack: {
         entry: ["src/index.ts"],
         format: ["esm"],
         dts: true,
       },
     });
     ```

3. **`packages/cli` 配置方案**：
   - 之前编译成压缩后的 `esm` 且不包含 dts 声明，并且对 `prompts` 有别名（`alias`）指向 `prompts/lib/index.js`。
   - 对应 `vite-plus` 配置：

     ```typescript
     import { defineConfig } from "vite-plus";

     export default defineConfig({
       resolve: {
         alias: {
           prompts: "prompts/lib/index.js",
         },
       },
       pack: {
         entry: ["src/index.ts"],
         format: ["esm"],
         minify: true,
       },
     });
     ```

## Dependencies & Scripts Refactoring

### Root `package.json`

- 替换 `"devDependencies"`：
  - 去掉：`unbuild`, `oxlint`, `oxfmt`
  - 增加：`vite-plus`
- 替换全局命令（`scripts`）：
  - `"format"` -> `"vp check --fix"`
  - `"lint"` -> `"vp check"`
  - `"typecheck"` -> `"vp check --no-fmt --no-lint"`
- 替换 `"simple-git-hooks"` 中的 `pre-commit` 指令为 `vp check --fix`。

### 各 Package 的 `package.json`

- 确保将 `vite-plus` 和 `typescript` 加入 `"devDependencies"` 以保证各自 package 内命令能成功调用本包上下文的 `vp pack`。
- 子包 scripts 更新：
  - `"build"` -> `"vp pack"`
  - `"dev"` -> `"vp pack --watch"`
  - `"typecheck"` -> `"vp check --no-fmt --no-lint"`
