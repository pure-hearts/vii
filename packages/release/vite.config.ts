import { defineConfig } from "vite-plus";

export default defineConfig({
  pack: {
    format: ["esm"],
    dts: true,
  } as any,
});
