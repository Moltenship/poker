import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AddTaskForm } from "../AddTaskForm";

// Mock useSessionMutation
const mockAddTask = vi.fn().mockResolvedValue("new-task-id");

vi.mock("@/hooks/useSession", () => ({
  useSessionMutation: vi.fn(() => mockAddTask),
  useSessionQuery: vi.fn().mockReturnValue(null),
  useSessionId: vi.fn().mockReturnValue("test-session"),
}));

describe("AddTaskForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders title input and add button", () => {
    render(<AddTaskForm roomId={"room-123" as any} />);
    
    expect(screen.getByLabelText("Task title")).toBeInTheDocument();
    expect(screen.getByLabelText("Description (optional)")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add Task" })).toBeInTheDocument();
  });

  it("shows validation error when title is empty", async () => {
    render(<AddTaskForm roomId={"room-123" as any} />);
    
    const submitBtn = screen.getByRole("button", { name: "Add Task" });
    fireEvent.click(submitBtn);
    
    expect(screen.getByText("Title is required")).toBeInTheDocument();
    expect(mockAddTask).not.toHaveBeenCalled();
  });

  it("submit calls addTask mutation with title and roomId and clears form after success", async () => {
    const onSuccess = vi.fn();
    render(<AddTaskForm roomId={"room-123" as any} onSuccess={onSuccess} />);
    
    const titleInput = screen.getByLabelText("Task title");
    const descInput = screen.getByLabelText("Description (optional)");
    const submitBtn = screen.getByRole("button", { name: "Add Task" });
    
    fireEvent.change(titleInput, { target: { value: "New Task" } });
    fireEvent.change(descInput, { target: { value: "Task details" } });
    fireEvent.click(submitBtn);
    
    await waitFor(() => {
      expect(mockAddTask).toHaveBeenCalledWith({
        roomId: "room-123",
        title: "New Task",
        description: "Task details",
      });
    });
    
    expect(onSuccess).toHaveBeenCalled();
    expect(titleInput).toHaveValue("");
    expect(descInput).toHaveValue("");
  });
});
