import { defineConfig } from "vite-plus";

export default defineConfig({
  pack: {
    format: ["esm", "cjs"],
    dts: true,
    minify: true,
  } as any,
});
