import { resolve } from "path";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  test: {
    environment: "jsdom",
    include: [
      "src/test/**/*.test.{ts,tsx}",
      "convex/**/*.test.ts",
      "src/lib/**/*.test.ts",
      "src/pages/**/*.test.{ts,tsx}",
      "src/components/**/*.test.{ts,tsx}",
    ],
    setupFiles: ["src/test/setup.ts"],
  },
});
