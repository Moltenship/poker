import { beforeEach, describe, expect, it, vi } from "vitest";
import { getSessionId } from "../useSession";

const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    clear: () => {
      store = {};
    },
  };
})();

beforeEach(() => {
  localStorageMock.clear();
  vi.stubGlobal("localStorage", localStorageMock);
  vi.stubGlobal("crypto", {
    randomUUID: vi.fn(() => "123e4567-e89b-12d3-a456-426614174000"),
  });
});

describe("getSessionId", () => {
  it("generates a UUID on first call", () => {
    const id = getSessionId();

    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });

  it("returns the same ID on subsequent calls", () => {
    const id1 = getSessionId();
    const id2 = getSessionId();

    expect(id1).toBe(id2);
  });

  it("persists across page reloads via localStorage", () => {
    const id1 = getSessionId();
    const id2 = getSessionId();

    expect(id1).toBe(id2);
  });

  it("reuses an existing localStorage session ID", () => {
    localStorage.setItem("poker_session_id", "existing-session-id");

    expect(getSessionId()).toBe("existing-session-id");
  });
});
