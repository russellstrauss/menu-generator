import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { cloudflare } from "@cloudflare/vite-plugin";
import * as compiler from "vue/compiler-sfc";

export default defineConfig({
  // Eager compiler avoids HMR racing buildStart() (null invalidateTypeCache).
  plugins: [vue({ compiler }), cloudflare()],
  server: {
    port: 5173,
  },
});
