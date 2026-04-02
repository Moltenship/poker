import { Button } from "@/components/ui/button";

interface RoomLobbyProps {
  canStartVoting: boolean;
  onStartVoting: () => void;
}

export function RoomLobby({ canStartVoting, onStartVoting }: RoomLobbyProps) {
  return (
    <div className="flex flex-1 items-center justify-center p-6" data-testid="room-lobby">
      <div className="max-w-xs space-y-4 text-center">
        <h2 className="text-base font-semibold">Ready to estimate?</h2>
        <p className="text-muted-foreground text-[13px]">
          Share the invite link, add tasks, then start.
        </p>
        <Button
          className="h-8 w-full text-[13px]"
          onClick={onStartVoting}
          disabled={!canStartVoting}
        >
          Start Voting
        </Button>
      </div>
    </div>
  );
}
