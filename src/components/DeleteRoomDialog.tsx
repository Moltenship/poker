import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface DeleteRoomDialogProps {
  roomName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
}

export function DeleteRoomDialog({
  roomName,
  open,
  onOpenChange,
  onConfirm,
}: DeleteRoomDialogProps) {
  const [confirmValue, setConfirmValue] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const isMatch = confirmValue === roomName;

  const handleConfirm = async () => {
    if (!isMatch || isDeleting) return;
    setIsDeleting(true);
    try {
      await onConfirm();
    } catch {
      setIsDeleting(false);
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setConfirmValue("");
      setIsDeleting(false);
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent showCloseButton={false} className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete room</DialogTitle>
          <DialogDescription>
            This will permanently delete the room and all its data including tasks, votes, and
            participants. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <p className="text-[13px]">
            Type <span className="text-foreground font-medium">{roomName}</span> to confirm:
          </p>
          <Input
            value={confirmValue}
            onChange={(e) => setConfirmValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleConfirm();
            }}
            placeholder="Room name"
            autoFocus
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isDeleting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={!isMatch || isDeleting}>
            {isDeleting ? "Deleting..." : "Delete room"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
