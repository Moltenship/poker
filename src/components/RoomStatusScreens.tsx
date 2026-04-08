import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";

export function RoomLoading() {
  return (
    <div
      className="bg-background flex h-screen items-center justify-center"
      data-testid="room-loading"
    >
      <div className="flex flex-col items-center gap-3">
        <div className="border-primary h-5 w-5 animate-spin rounded-full border-2 border-t-transparent" />
        <p className="text-muted-foreground text-[13px]">Loading...</p>
      </div>
    </div>
  );
}

interface RoomNotFoundProps {
  roomCode: string | undefined;
}

export function RoomNotFound({ roomCode }: RoomNotFoundProps) {
  return (
    <div className="bg-background flex h-screen items-center justify-center">
      <div className="max-w-xs text-center">
        <h2 className="mb-1 text-sm font-semibold">Room not found</h2>
        <p className="text-muted-foreground mb-4 text-[13px]">
          Code{" "}
          <code className="bg-muted rounded px-1 py-0.5 font-mono text-[12px]">{roomCode}</code> is
          invalid or expired.
        </p>
        <Link to="/">
          <Button variant="secondary" size="sm" className="h-7 text-[13px]">
            <ArrowLeft className="mr-1.5 h-3 w-3" />
            Home
          </Button>
        </Link>
      </div>
    </div>
  );
}

interface RoomRemovedProps {
  onRejoin: () => void;
  onGoHome?: () => void;
}

export function RoomRemoved({ onRejoin }: RoomRemovedProps) {
  return (
    <div className="bg-background flex h-screen items-center justify-center">
      <div className="max-w-xs space-y-4 text-center">
        <h2 className="text-sm font-semibold">You were removed from this room</h2>
        <p className="text-muted-foreground text-[13px]">The host removed you from the session.</p>
        <div className="flex justify-center gap-2">
          <Button variant="secondary" size="sm" className="h-7 text-[13px]" onClick={onRejoin}>
            Rejoin
          </Button>
          <Link to="/">
            <Button variant="outline" size="sm" className="h-7 text-[13px]">
              <ArrowLeft className="mr-1.5 h-3 w-3" />
              Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
