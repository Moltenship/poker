import { useEffect, useState } from "react";

import { useSessionMutation } from "@/hooks/useSession";

import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Input } from "./ui/input";

interface HoursInputProps {
  taskId: Id<"tasks">;
  currentHours: number | undefined;
}

export function HoursInput({ taskId, currentHours }: HoursInputProps) {
  const [value, setValue] = useState(currentHours?.toString() ?? "");
  const setHoursEstimate = useSessionMutation(api.tasks.setHoursEstimate);

  useEffect(() => {
    if (currentHours !== undefined) {
      setValue(currentHours.toString());
    }
  }, [currentHours]);

  useEffect(() => {
    const handler = setTimeout(() => {
      const numValue = parseFloat(value);
      if (!isNaN(numValue) && numValue !== currentHours) {
        setHoursEstimate({ hours: numValue, taskId });
      }
    }, 500);

    return () => clearTimeout(handler);
  }, [value, taskId, currentHours, setHoursEstimate]);

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="hours-input" className="text-sm font-medium">
        Hours Annotation
      </label>
      <Input
        id="hours-input"
        type="number"
        step="0.5"
        min="0"
        placeholder="e.g. 4.5"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-full"
      />
    </div>
  );
}
