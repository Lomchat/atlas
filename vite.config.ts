import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// ATLAS_HMR=0 disables live reload: useful when several people edit scenes
// while screenshots or browser tests run against the same dev server.
export default defineConfig({
  plugins: [react()],
  optimizeDeps: { entries: ["index.html"] },
  server: {
    hmr: process.env.ATLAS_HMR === "0" ? false : { overlay: false },
  },
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: { output: { manualChunks: { three: ["three"] } } },
  },
});
