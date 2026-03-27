import type { Id } from "../../convex/_generated/dataModel";
import { useSessionMutation } from "@/hooks/useSession";
import { api } from "../../convex/_generated/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { useState } from "react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";

export interface FinalEstimateSelectorProps {
  taskId: Id<"tasks">;
  cardSet: string[];
  currentEstimate: string | undefined;
}

export function FinalEstimateSelector({
  taskId,
  cardSet,
  currentEstimate,
}: FinalEstimateSelectorProps) {
  const setFinalEstimate = useSessionMutation(api.tasks.setFinalEstimate);
  const [isCustom, setIsCustom] = useState(false);
  const [customValue, setCustomValue] = useState("");

  const handleSelect = (value: string | null) => {
    if (!value) return;
    if (value === "custom") {
      setIsCustom(true);
      return;
    }
    setIsCustom(false);
    setFinalEstimate({ taskId, estimate: value });
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customValue.trim()) {
      setFinalEstimate({ taskId, estimate: customValue.trim() });
      setIsCustom(false);
      setCustomValue("");
    }
  };

  const displayValue = isCustom ? "custom" : currentEstimate ?? "";

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium">Final Estimate</label>
      <div className="flex gap-2">
        {!isCustom ? (
          <Select value={displayValue} onValueChange={handleSelect}>
            <SelectTrigger className="w-full max-w-[200px]">
              <SelectValue placeholder="Select estimate..." />
            </SelectTrigger>
            <SelectContent>
              {cardSet.map((card) => (
                <SelectItem key={card} value={card}>
                  {card}
                </SelectItem>
              ))}
              <SelectItem value="custom">Custom...</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <form onSubmit={handleCustomSubmit} className="flex gap-2 w-full max-w-[300px]">
            <Input
              autoFocus
              value={customValue}
              onChange={(e) => setCustomValue(e.target.value)}
              placeholder="Enter custom estimate"
              className="flex-1"
            />
            <Button type="submit" size="sm">
              Save
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCustom(false)}
            >
              Cancel
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
