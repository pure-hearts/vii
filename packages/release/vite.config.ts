import { defineConfig } from "vite-plus";

export default defineConfig({
  pack: {
    format: ["esm", "cjs"],
    dts: true,
  } as any,
});
