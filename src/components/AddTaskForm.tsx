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
  const [description, setDescription] = useState("");
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
        description: description.trim() || undefined,
      });
      setTitle("");
      setDescription("");
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
      />
      {error && <p className="text-[12px] text-destructive">{error}</p>}

      <textarea
        id="task-description"
        rows={2}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description (optional)"
        disabled={isPending}
        className="w-full rounded-md bg-muted/80 px-2.5 py-1.5 text-[13px] outline-none placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring/50 disabled:opacity-50 resize-none"
      />

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={isPending} className="flex-1 text-[13px]">
          {isPending && <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />}
          Add Task
        </Button>
      </div>
    </form>
  );
}
