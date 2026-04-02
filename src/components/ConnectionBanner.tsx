import { useConvexConnectionState } from "convex/react";

export function ConnectionDot() {
  const connectionState = useConvexConnectionState();
  const isConnected = connectionState.isWebSocketConnected;

  return (
    <div
      className={`h-2 w-2 rounded-full transition-colors ${isConnected ? "bg-emerald-500" : "animate-pulse bg-amber-500"}`}
      title={isConnected ? "Connected" : "Reconnecting..."}
    />
  );
}
