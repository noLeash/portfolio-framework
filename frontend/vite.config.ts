import { defineConfig } from "vite";
// import react from "@vitejs/plugin-react";
import { reactRouter } from "@react-router/dev/vite";

export default defineConfig({
  plugins: [reactRouter()],
  server: {
    host: "0.0.0.0",
    port: 5172,
    strictPort: true,
    allowedHosts: [
      "gcomollo-frontend",
      "localhost",
      "dev.gcomollo.com",
      "gcomollo.localhost",
    ],
    // Backend is mounted with root_path="/api", so strip the prefix before forwarding
    proxy: {
      "/api": {
        target: "http://backend-gcomollo:6942",
        changeOrigin: true,
        xfwd: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
    watch: {
      usePolling: true,
      interval: 200,
    },
  },
});
