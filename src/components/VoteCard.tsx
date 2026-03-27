import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface VoteCardProps {
  value: string;
  isSelected: boolean;
  isDisabled: boolean;
  onClick: () => void;
}

export function VoteCard({
  value,
  isSelected,
  isDisabled,
  onClick,
}: VoteCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      aria-pressed={isSelected}
      className={cn(
        "relative flex h-24 w-16 md:h-32 md:w-24 items-center justify-center rounded-xl border-2 transition-all duration-200",
        "bg-white shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
        "text-2xl font-bold md:text-3xl",
        isSelected
          ? "border-blue-500 bg-blue-50 text-blue-700 shadow-blue-100"
          : "border-slate-200 text-slate-700",
        !isDisabled && !isSelected && "hover:-translate-y-1 hover:border-slate-300 hover:bg-slate-50",
        isDisabled && "cursor-not-allowed opacity-50 shadow-none hover:translate-y-0"
      )}
    >
      <span>{value}</span>
      {isSelected && (
        <div className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-white shadow-sm">
          <Check className="h-4 w-4" strokeWidth={3} />
        </div>
      )}
    </button>
  );
}
