import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  appType: "spa",
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  base: "./",
  server: {
    host: true,
  },
});
