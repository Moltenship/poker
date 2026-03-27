import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["src/test/setup.ts"],
    include: ["src/test/**/*.test.{ts,tsx}", "convex/**/*.test.ts", "src/lib/**/*.test.ts", "src/pages/**/*.test.{ts,tsx}", "src/components/**/*.test.{ts,tsx}"],
    environmentMatchGlobs: [
      ["convex/**/*.test.ts", "node"],
      ["src/lib/**/*.test.ts", "node"],
    ],
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
});
