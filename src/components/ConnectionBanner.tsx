import { useConvexConnectionState } from "convex/react";

export function ConnectionBanner() {
  // No-op: replaced by ConnectionDot in headers
  return null;
}

export function ConnectionDot() {
  const connectionState = useConvexConnectionState();
  const isConnected = connectionState.isWebSocketConnected;

  return (
    <div
      className={`w-2 h-2 rounded-full transition-colors ${isConnected ? "bg-emerald-500" : "bg-amber-500 animate-pulse"}`}
      title={isConnected ? "Connected" : "Reconnecting..."}
    />
  );
}
