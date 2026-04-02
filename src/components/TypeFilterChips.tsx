import { FilterChip } from "@/components/FilterChip";
import { Separator } from "@/components/ui/separator";

interface TypeFilterChipsProps {
  availableTypes: string[];
  selectedTypes: string[];
  onToggle: (type: string) => void;
  onClear: () => void;
}

export function TypeFilterChips({
  availableTypes,
  selectedTypes,
  onToggle,
  onClear,
}: TypeFilterChipsProps) {
  if (availableTypes.length === 0) {
    return null;
  }

  return (
    <>
      <Separator className="my-1" />
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          Type
        </span>
        {selectedTypes.length > 0 && (
          <button
            className="text-muted-foreground hover:text-foreground text-xs transition-colors"
            onClick={onClear}
          >
            Clear
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {availableTypes.map((type) => (
          <FilterChip
            key={type}
            selected={selectedTypes.includes(type)}
            onClick={() => onToggle(type)}
          >
            {type}
          </FilterChip>
        ))}
      </div>
      {selectedTypes.length === 0 && (
        <p className="text-muted-foreground text-xs">Showing all types</p>
      )}
    </>
  );
}
