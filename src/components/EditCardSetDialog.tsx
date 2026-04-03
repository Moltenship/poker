import { useConvexMutation } from "@convex-dev/react-query";
import { Plus, Settings2 } from "lucide-react";
import { useCallback, useState } from "react";

import { CardListItem } from "@/components/CardListItem";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useDragReorder } from "@/hooks/useDragReorder";
import { detectPreset, FIBONACCI, FIBONACCI_EXTENDED } from "@/lib/cards";

import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

interface EditCardSetDialogProps {
  roomId: Id<"rooms">;
  currentCardSet: string[];
}

export function EditCardSetDialog({ roomId, currentCardSet }: EditCardSetDialogProps) {
  const updateCardSet = useConvexMutation(api.rooms.updateCardSet);

  const [open, setOpen] = useState(false);
  const [cards, setCards] = useState<string[]>(currentCardSet);
  const [presetType, setPresetType] = useState<"fibonacci" | "extended" | "custom">(() =>
    detectPreset(currentCardSet),
  );
  const [newCard, setNewCard] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const {
    dragOverIndex,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDragEnd,
  } = useDragReorder((fromIndex, toIndex) => {
    setCards((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
    setPresetType("custom");
  });

  const resetState = useCallback(() => {
    setCards(currentCardSet);
    setPresetType(detectPreset(currentCardSet));
    setNewCard("");
    setEditingIndex(null);
    setEditValue("");
    setError("");
    setSaving(false);
  }, [currentCardSet]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      resetState();
    }
    setOpen(nextOpen);
  };

  const handlePresetChange = (value: "fibonacci" | "extended" | "custom") => {
    setPresetType(value);
    if (value === "fibonacci") {
      setCards([...FIBONACCI.values]);
    } else if (value === "extended") {
      setCards([...FIBONACCI_EXTENDED.values]);
    }
    // "custom" keeps current cards for editing
    setEditingIndex(null);
    setError("");
  };

  const handleAddCard = () => {
    const trimmed = newCard.trim();
    if (!trimmed) {
      return;
    }
    if (cards.includes(trimmed)) {
      setError(`"${trimmed}" already exists`);
      return;
    }
    setCards((prev) => [...prev, trimmed]);
    setPresetType("custom");
    setNewCard("");
    setError("");
  };

  const handleRemoveCard = (index: number) => {
    setCards((prev) => prev.filter((_, i) => i !== index));
    setPresetType("custom");
    if (editingIndex === index) {
      setEditingIndex(null);
      setEditValue("");
    }
    setError("");
  };

  const handleStartEdit = (index: number) => {
    setEditingIndex(index);
    setEditValue(cards[index]);
    setError("");
  };

  const handleConfirmEdit = () => {
    if (editingIndex === null) {
      return;
    }
    const trimmed = editValue.trim();
    if (!trimmed) {
      setError("Card value cannot be empty");
      return;
    }
    const duplicate = cards.findIndex((c, i) => c === trimmed && i !== editingIndex);
    if (duplicate !== -1) {
      setError(`"${trimmed}" already exists`);
      return;
    }
    setCards((prev) => prev.map((c, i) => (i === editingIndex ? trimmed : c)));
    setPresetType("custom");
    setEditingIndex(null);
    setEditValue("");
    setError("");
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditValue("");
    setError("");
  };

  const handleSave = async () => {
    if (cards.length === 0) {
      setError("At least one card is required");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await updateCardSet({ cardSet: cards, roomId });
      setOpen(false);
    } catch (err) {
      setError("Failed to update card set. Please try again.");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const hasChanges =
    cards.length !== currentCardSet.length || cards.some((c, i) => c !== currentCardSet[i]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon-xs" className="text-muted-foreground">
              <Settings2 className="h-3.5 w-3.5" />
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>Edit card set</TooltipContent>
      </Tooltip>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Edit Card Set</DialogTitle>
          <DialogDescription>Choose a preset or customize individual cards.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Preset selector */}
          <div className="space-y-1.5">
            <label className="text-[13px] font-medium">Preset</label>
            <Select
              value={presetType}
              onValueChange={(v) => handlePresetChange(v as "fibonacci" | "extended" | "custom")}
            >
              <SelectTrigger className="h-8 text-[13px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fibonacci">Fibonacci (1, 2, 3, 5, 8...)</SelectItem>
                <SelectItem value="extended">Extended (0, 1/2, 1... ?, coffee)</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Card list */}
          <div className="space-y-1.5">
            <label className="text-[13px] font-medium">
              Cards <span className="text-muted-foreground font-normal">({cards.length})</span>
            </label>
            <div className="bg-accent/30 max-h-48 overflow-auto rounded-lg border">
              {cards.length === 0 ? (
                <p className="text-muted-foreground px-3 py-4 text-center text-[13px]">
                  No cards yet. Add one below.
                </p>
              ) : (
                <div className="divide-border/40 divide-y">
                  {cards.map((card, index) => (
                    <CardListItem
                      key={`${card}-${index}`}
                      card={card}
                      index={index}
                      isEditing={editingIndex === index}
                      editValue={editValue}
                      isDragOver={dragOverIndex === index}
                      onStartEdit={() => handleStartEdit(index)}
                      onConfirmEdit={handleConfirmEdit}
                      onCancelEdit={handleCancelEdit}
                      onEditValueChange={setEditValue}
                      onRemove={() => handleRemoveCard(index)}
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, index)}
                      onDragEnd={handleDragEnd}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Add card */}
          <div className="flex gap-2">
            <Input
              placeholder="New card value"
              value={newCard}
              onChange={(e) => {
                setNewCard(e.target.value);
                setError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddCard();
                }
              }}
              className="h-8 flex-1 text-[13px]"
            />
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1 text-[13px]"
              onClick={handleAddCard}
              disabled={!newCard.trim()}
            >
              <Plus className="h-3 w-3" />
              Add
            </Button>
          </div>

          {error ? <p className="text-destructive text-[12px]">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-[13px]"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            className="h-8 text-[13px]"
            onClick={handleSave}
            disabled={saving || !hasChanges || cards.length === 0}
          >
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
