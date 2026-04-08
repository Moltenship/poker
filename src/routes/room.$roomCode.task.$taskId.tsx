import { createFileRoute } from "@tanstack/react-router";

/** Task sub-route for /room/:roomCode/task/:taskId — Room component renders via the parent layout. */
export const Route = createFileRoute("/room/$roomCode/task/$taskId")({
  component: () => null,
});
