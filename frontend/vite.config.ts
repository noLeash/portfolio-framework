import { defineConfig } from "vite";
// import react from "@vitejs/plugin-react";
import { reactRouter } from "@react-router/dev/vite";

export default defineConfig({
  plugins: [reactRouter()],
  // Force a single React copy; mismatched pre-bundles caused "reading 'useContext'" of null
  resolve: {
    dedupe: ["react", "react-dom", "react-router"],
  },
  // Pre-bundle deep imports up front so Vite doesn't re-optimize mid-session
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-dom/client",
      "react-router",
      "rsuite",
      "rsuite/esm/internals/Overlay/Modal",
      "@rsuite/icons/Trash",
      "@rsuite/icons/Edit",
      "@rsuite/icons/Dragable",
      "@rsuite/icons/Save",
      "@rsuite/icons/RemindFill",
      "@rsuite/icons/Reload",
      "@rsuite/icons/Copy",
      "@rsuite/icons/Close",
      "@rsuite/icons/CheckOutline",
      "react-icons/rx",
      "jwt-decode",
    ],
  },
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
