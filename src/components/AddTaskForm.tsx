import React, { useState } from "react";
import { useSessionMutation } from "@/hooks/useSession";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

interface AddTaskFormProps {
  roomId: Id<"rooms">;
  onSuccess?: () => void;
}

export function AddTaskForm({ roomId, onSuccess }: AddTaskFormProps) {
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const addTask = useSessionMutation(api.tasks.addTask);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError("Title is required");
      return;
    }

    setError(null);
    setIsPending(true);

    try {
      await addTask({
        roomId,
        title: trimmedTitle,
      });
      setTitle("");
      onSuccess?.();
    } catch (err) {
      setError("Failed to add task");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2" data-testid="add-task-form">
      <Input
        id="task-title"
        value={title}
        onChange={(e) => {
          setTitle(e.target.value);
          if (error) setError(null);
        }}
        placeholder="Task title"
        maxLength={200}
        disabled={isPending}
        className="text-[13px]"
        aria-invalid={error ? true : undefined}
      />
      {error && <p className="text-[12px] text-destructive">{error}</p>}

      <Button type="submit" size="sm" disabled={isPending} className="w-full text-[13px]">
        {isPending && <Loader2 className="animate-spin" data-icon="inline-start" />}
        Add Task
      </Button>
    </form>
  );
}
