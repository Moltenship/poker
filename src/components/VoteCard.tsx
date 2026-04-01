import { cn } from "@/lib/utils";

interface VoteCardProps {
  value: string;
  isSelected: boolean;
  isDisabled: boolean;
  onClick: () => void;
  compact?: boolean;
}

export function VoteCard({ value, isSelected, isDisabled, onClick, compact }: VoteCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      aria-pressed={isSelected}
      className={cn(
        "relative flex items-center justify-center rounded-md border transition-all duration-200",
        compact
          ? "h-12 w-9 md:h-14 md:w-11 text-xs md:text-sm"
          : "h-20 w-14 md:h-24 md:w-16 text-sm md:text-base",
        "font-medium",
        isSelected
          ? "bg-primary text-primary-foreground border-primary -translate-y-1"
          : "bg-muted/50 text-foreground/70 border-border",
        !isDisabled && !isSelected && "hover:bg-muted hover:text-foreground",
        isDisabled && "cursor-not-allowed opacity-30"
      )}
    >
      {value}
    </button>
  );
}
