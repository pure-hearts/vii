import DefaultTheme from "vitepress/theme";
import "./custom.css";
import StoragePlayground from "../../components/StoragePlayground.vue";
import type { Theme } from "vitepress";

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component("StoragePlayground", StoragePlayground);
  },
} satisfies Theme;
