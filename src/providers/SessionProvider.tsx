import { createContext, useContext, useMemo, type ReactNode } from "react";
import { getSessionId } from "@/hooks/useSession";

const SessionContext = createContext<string>("");

export function SessionProvider({ children }: { children: ReactNode }) {
  const sessionId = useMemo(() => getSessionId(), []);

  return (
    <SessionContext.Provider value={sessionId}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}
