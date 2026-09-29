import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["tests/**/*.test.{ts,tsx}"],
    // Only the test database is exposed to tests. The production DATABASE_URL from
    // .env.local is deliberately not passed through, so no test can write to it.
    env: { DATABASE_URL_TEST: loadEnv(mode, process.cwd(), "").DATABASE_URL_TEST ?? "" },
  },
}));
