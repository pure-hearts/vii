import { defineConfig } from "vite-plus";

export default defineConfig({
  resolve: {
    alias: {
      prompts: "prompts/lib/index.js",
    },
  },
  pack: {
    format: ["esm"],
    minify: true,
  } as any,
});
