import { experimental_createQueryPersister } from "@tanstack/query-persist-client-core";
import { createStore, del, get, set } from "idb-keyval";

const store = createStore("poker-query-cache", "jira");

const idbStorage = {
  getItem: async (key: string): Promise<string | null> => {
    const value = await get<string>(key, store);
    return value ?? null;
  },
  setItem: async (key: string, value: string): Promise<void> => {
    await set(key, value, store);
  },
  removeItem: async (key: string): Promise<void> => {
    await del(key, store);
  },
};

const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;

const { persisterFn } = experimental_createQueryPersister({
  storage: idbStorage,
  maxAge: FOURTEEN_DAYS_MS,
  prefix: "jira-cache",
  refetchOnRestore: true,
});

/**
 * Shared query options for all Jira action queries.
 *
 * - `staleTime` — 5 min; controls when background refetch fires.
 * - `gcTime` — Infinity; keeps data in memory for the entire session
 *   so in-session re-mounts never flash a loading state.
 * - `persister` — saves/restores query results to IndexedDB via idb-keyval
 *   for cross-session cache. On cold start, cached data renders immediately
 *   while a background refetch replaces it with fresh data.
 */
export const JIRA_QUERY_OPTIONS = {
  staleTime: 5 * 60 * 1000,
  gcTime: Infinity,
  persister: persisterFn,
};
