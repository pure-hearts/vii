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
