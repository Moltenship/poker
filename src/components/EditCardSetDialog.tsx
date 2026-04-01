import { useState, useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { FIBONACCI, FIBONACCI_EXTENDED } from "@/lib/cards";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Settings2, Plus, X, GripVertical } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface EditCardSetDialogProps {
  roomId: Id<"rooms">;
  currentCardSet: string[];
}

function detectPreset(cards: string[]): "fibonacci" | "extended" | "custom" {
  const fibMatch =
    cards.length === FIBONACCI.values.length &&
    cards.every((c, i) => c === FIBONACCI.values[i]);
  if (fibMatch) return "fibonacci";

  const extMatch =
    cards.length === FIBONACCI_EXTENDED.values.length &&
    cards.every((c, i) => c === FIBONACCI_EXTENDED.values[i]);
  if (extMatch) return "extended";

  return "custom";
}

export function EditCardSetDialog({ roomId, currentCardSet }: EditCardSetDialogProps) {
  const updateCardSet = useMutation(api.rooms.updateCardSet);

  const [open, setOpen] = useState(false);
  const [cards, setCards] = useState<string[]>(currentCardSet);
  const [presetType, setPresetType] = useState<"fibonacci" | "extended" | "custom">(
    () => detectPreset(currentCardSet)
  );
  const [newCard, setNewCard] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

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
    if (nextOpen) resetState();
    setOpen(nextOpen);
  };

  const handlePresetChange = (value: "fibonacci" | "extended" | "custom") => {
    setPresetType(value);
    if (value === "fibonacci") setCards([...FIBONACCI.values]);
    else if (value === "extended") setCards([...FIBONACCI_EXTENDED.values]);
    // "custom" keeps current cards for editing
    setEditingIndex(null);
    setError("");
  };

  const handleAddCard = () => {
    const trimmed = newCard.trim();
    if (!trimmed) return;
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
    if (editingIndex === null) return;
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
      await updateCardSet({ roomId, cardSet: cards });
      setOpen(false);
    } catch (err) {
      setError("Failed to update card set. Please try again.");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const hasChanges =
    cards.length !== currentCardSet.length ||
    cards.some((c, i) => c !== currentCardSet[i]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              className="text-muted-foreground"
            >
              <Settings2 className="h-3.5 w-3.5" />
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>Edit card set</TooltipContent>
      </Tooltip>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Edit Card Set</DialogTitle>
          <DialogDescription>
            Choose a preset or customize individual cards.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Preset selector */}
          <div className="space-y-1.5">
            <label className="text-[13px] font-medium">Preset</label>
            <Select value={presetType} onValueChange={(v) => handlePresetChange(v as "fibonacci" | "extended" | "custom")}>
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
            <div className="rounded-lg border bg-accent/30 max-h-48 overflow-auto">
              {cards.length === 0 ? (
                <p className="px-3 py-4 text-center text-[13px] text-muted-foreground">
                  No cards yet. Add one below.
                </p>
              ) : (
                <div className="divide-y divide-border/40">
                  {cards.map((card, index) => (
                    <div
                      key={`${card}-${index}`}
                      className="flex items-center gap-2 px-2 py-1.5 group"
                    >
                      <GripVertical className="h-3 w-3 text-muted-foreground/40 shrink-0" />
                      {editingIndex === index ? (
                        <div className="flex-1 flex items-center gap-1.5">
                          <Input
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleConfirmEdit();
                              if (e.key === "Escape") handleCancelEdit();
                            }}
                            className="h-7 text-[13px] flex-1"
                            autoFocus
                          />
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={handleConfirmEdit}
                            className="text-primary shrink-0"
                          >
                            <span className="text-[11px] font-medium">OK</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={handleCancelEdit}
                            className="text-muted-foreground shrink-0"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <button
                            className="flex-1 text-left text-[13px] font-mono rounded px-1.5 py-0.5 hover:bg-accent transition-colors truncate"
                            onClick={() => handleStartEdit(index)}
                            title="Click to edit"
                          >
                            {card}
                          </button>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => handleRemoveCard(index)}
                            className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity shrink-0"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </>
                      )}
                    </div>
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
              onChange={(e) => { setNewCard(e.target.value); setError(""); }}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddCard(); } }}
              className="flex-1 h-8 text-[13px]"
            />
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-[13px] gap-1"
              onClick={handleAddCard}
              disabled={!newCard.trim()}
            >
              <Plus className="h-3 w-3" />
              Add
            </Button>
          </div>

          {error && (
            <p className="text-[12px] text-destructive">{error}</p>
          )}
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
