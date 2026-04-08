import { createFileRoute } from "@tanstack/react-router";

/** Index route for /room/:roomCode — Room component renders via the parent layout. */
export const Route = createFileRoute("/room/$roomCode/")({
  component: () => null,
});
