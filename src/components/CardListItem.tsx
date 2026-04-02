import { GripVertical, X } from "lucide-react";
import React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface CardListItemProps {
  card: string;
  index: number;
  isEditing: boolean;
  editValue: string;
  isDragOver: boolean;
  onStartEdit: () => void;
  onConfirmEdit: () => void;
  onCancelEdit: () => void;
  onEditValueChange: (value: string) => void;
  onRemove: () => void;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}

export function CardListItem({
  card,
  isEditing,
  editValue,
  isDragOver,
  onStartEdit,
  onConfirmEdit,
  onCancelEdit,
  onEditValueChange,
  onRemove,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
}: CardListItemProps) {
  return (
    <div
      draggable={!isEditing}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={`group flex items-center gap-2 px-2 py-1.5 transition-colors ${
        isDragOver ? "bg-accent border-t-primary border-t-2" : ""
      }`}
    >
      <GripVertical className="text-muted-foreground/40 h-3 w-3 shrink-0 cursor-grab active:cursor-grabbing" />
      {isEditing ? (
        <div className="flex flex-1 items-center gap-1.5">
          <Input
            value={editValue}
            onChange={(e) => onEditValueChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onConfirmEdit();
              }
              if (e.key === "Escape") {
                onCancelEdit();
              }
            }}
            className="h-7 flex-1 text-[13px]"
            autoFocus
          />
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={onConfirmEdit}
            className="text-primary shrink-0"
          >
            <span className="text-[11px] font-medium">OK</span>
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={onCancelEdit}
            className="text-muted-foreground shrink-0"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <>
          <button
            className="hover:bg-accent flex-1 truncate rounded px-1.5 py-0.5 text-left font-mono text-[13px] transition-colors"
            onClick={onStartEdit}
            title="Click to edit"
          >
            {card}
          </button>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={onRemove}
            className="text-muted-foreground hover:text-destructive shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
          >
            <X className="h-3 w-3" />
          </Button>
        </>
      )}
    </div>
  );
}
