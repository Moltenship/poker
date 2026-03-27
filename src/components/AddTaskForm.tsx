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
    <form onSubmit={handleSubmit} className="flex flex-col gap-3" data-testid="add-task-form">
      <div>
        <label htmlFor="task-title" className="text-sm font-medium mb-1 block">
          Task title
        </label>
        <Input
          id="task-title"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (error) setError(null);
          }}
          placeholder="e.g. Implement login"
          maxLength={200}
          disabled={isPending}
        />
        {error && <p className="text-sm text-destructive mt-1">{error}</p>}
      </div>

      <div>
        <label htmlFor="task-description" className="text-sm font-medium mb-1 block">
          Description (optional)
        </label>
        <textarea
          id="task-description"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add more details..."
          disabled={isPending}
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Add Task
      </Button>
    </form>
  );
}
