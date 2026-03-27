import { cn } from "@/lib/utils";

interface VoteCardProps {
  value: string;
  isSelected: boolean;
  isDisabled: boolean;
  onClick: () => void;
}

export function VoteCard({ value, isSelected, isDisabled, onClick }: VoteCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      aria-pressed={isSelected}
      className={cn(
        "relative flex items-center justify-center rounded-md border transition-all duration-100",
        "h-20 w-14 md:h-24 md:w-16",
        "text-sm font-medium md:text-base",
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
