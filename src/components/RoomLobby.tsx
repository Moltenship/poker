export function RoomLobby() {
  return (
    <div className="flex flex-1 items-center justify-center p-6" data-testid="room-lobby">
      <div className="max-w-xs space-y-2 text-center">
        <h2 className="text-base font-semibold">Waiting for tasks</h2>
        <p className="text-muted-foreground text-[13px]">
          Add tasks from the sidebar and invite your team to get started.
        </p>
      </div>
    </div>
  );
}
