import { useState, useEffect } from "react";
import { useConvexConnectionState } from "convex/react";

export function ConnectionBanner() {
  const connectionState = useConvexConnectionState();
  const isConnected = connectionState.isWebSocketConnected;
  const [prevConnected, setPrevConnected] = useState<boolean | null>(null);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    if (prevConnected === false && isConnected === true) {
      // Was disconnected, now reconnected
      setShowReconnected(true);
      const timer = setTimeout(() => setShowReconnected(false), 3000);
      return () => clearTimeout(timer);
    }
    setPrevConnected(isConnected);
  }, [isConnected, prevConnected]);

  if (isConnected && !showReconnected) return null;

  if (showReconnected) {
    return (
      <div className="fixed top-0 left-0 right-0 z-[100] bg-green-500/20 border-b border-green-500/40 px-4 py-3 text-sm font-medium text-green-700">
        ✓ Back online!
      </div>
    );
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-yellow-500/20 border-b border-yellow-500/40 px-4 py-3 text-sm font-medium text-yellow-700">
      <span className="inline-block w-2 h-2 rounded-full bg-yellow-500 animate-pulse mr-2" />
      Connection lost. Reconnecting...
    </div>
  );
}
