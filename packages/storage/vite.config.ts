import { defineConfig } from "vite";

export default defineConfig({
  build: {
    minify: false,
    lib: {
      entry: {
        index: "./src/index.ts",
        "drivers/cookie": "./src/drivers/cookie.ts",
        "drivers/indexeddb": "./src/drivers/indexeddb.ts",
        "drivers/custom": "./src/drivers/custom.ts",
      },
      formats: ["es", "cjs"],
    },
    rollupOptions: {
      output: {
        exports: "named",
      },
    },
  },
});
