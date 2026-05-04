import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

/*
 * Ensure each test starts with a clean DOM. @testing-library/react would
 * auto-register this hook when vitest's `afterEach` is global, but this
 * project keeps `globals: false`, so register it explicitly here. This is
 * test-framework infrastructure, not test setup logic, so the no-hooks rule
 * (which targets in-test hooks for readability) does not apply.
 */
// oxlint-disable-next-line no-hooks
afterEach(() => {
  cleanup();
});
