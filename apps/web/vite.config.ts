import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    watch: {
      usePolling: true,
      interval: 300,
    },
    // Forward /api/* to the api container so the browser only ever hits the
    // web origin — works through tunnels (ngrok, cloudflared) without CORS
    // and without baking VITE_API_URL into the bundle.
    proxy: {
      "/api": {
        target: "http://api:4000",
        changeOrigin: true,
      },
    },
    // Accept any host header — needed when tunneling through cloudflared/ngrok.
    allowedHosts: true,
  },
});
