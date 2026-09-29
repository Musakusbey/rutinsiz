import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["tests/**/*.test.{ts,tsx}"],
    // Makes DATABASE_URL_TEST from .env.local visible to the integration test.
    env: loadEnv(mode, process.cwd(), ""),
  },
}));
