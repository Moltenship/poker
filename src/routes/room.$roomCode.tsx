import { createFileRoute, Outlet } from "@tanstack/react-router";

import Room from "@/pages/Room";

export const Route = createFileRoute("/room/$roomCode")({
  component: RoomLayout,
});

/**
 * Layout route for /room/:roomCode and all sub-paths (e.g. /room/:roomCode/task/:taskId).
 * Room renders the full UI; child routes render nothing visible inside the Outlet.
 */
function RoomLayout() {
  return (
    <>
      <Room />
      <Outlet />
    </>
  );
}
