import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// A plain static site: `vite build` emits dist/ and any HTTP server can serve it. In dev, /api goes
// to the API (`pnpm dev:api`), so the browser sees one origin, as it will in production.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { host: true, port: 5173, proxy: { "/api": "http://localhost:3000" } },
  preview: { port: 4173 },
});
