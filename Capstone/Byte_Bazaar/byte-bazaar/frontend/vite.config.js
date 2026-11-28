import { defineConfig } from "vite";
export default defineConfig({
  server: {
    fs: { allow: [".."] },
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": process.env.BYTEBAZAAR_API_URL || "http://127.0.0.1:18080",
    },
  },
});
