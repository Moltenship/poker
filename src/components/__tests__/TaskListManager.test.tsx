import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { TaskListManager, Task } from "../TaskListManager";

const mockSessionMutation = vi.fn().mockResolvedValue(undefined);

vi.mock("@/hooks/useSession", () => ({
  useSessionMutation: vi.fn(() => mockSessionMutation),
  useSessionQuery: vi.fn().mockReturnValue(null),
  useSessionId: vi.fn().mockReturnValue("test-session"),
}));

vi.mock("convex/react", () => ({
  useQuery: vi.fn().mockReturnValue(undefined),
  useMutation: vi.fn().mockReturnValue(vi.fn()),
}));

describe("TaskListManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockTasks: Task[] = [
    {
      _id: "task-1" as any,
      title: "Manual Task",
      isManual: true,
      order: 1,
    },
    {
      _id: "task-2" as any,
      title: "Jira Task",
      isManual: false,
      order: 2,
    }
  ];

  it("renders empty state when no tasks", () => {
    render(<TaskListManager roomId={"room-1" as any} tasks={[]} currentTaskIndex={0} />);
    expect(screen.getByText("No tasks yet. Add manually or import from Jira.")).toBeInTheDocument();
  });

  it("renders tasks with titles", () => {
    render(<TaskListManager roomId={"room-1" as any} tasks={mockTasks} currentTaskIndex={0} />);
    expect(screen.getByText("Manual Task")).toBeInTheDocument();
    expect(screen.getByText("Jira Task")).toBeInTheDocument();
  });

  it("shows delete button only for manual tasks", () => {
    render(<TaskListManager roomId={"room-1" as any} tasks={mockTasks} currentTaskIndex={0} />);
    
    const deleteBtnManual = screen.queryByLabelText("Delete task Manual Task");
    expect(deleteBtnManual).toBeInTheDocument();
    
    const deleteBtnJira = screen.queryByLabelText("Delete task Jira Task");
    expect(deleteBtnJira).not.toBeInTheDocument();
  });

  it("highlights current task", () => {
    const { container } = render(<TaskListManager roomId={"room-1" as any} tasks={mockTasks} currentTaskIndex={1} />);
    
    const task2 = screen.getByText("Jira Task").closest("div.border-b");
    expect(task2).toHaveClass("bg-primary/10");
    
    const task1 = screen.getByText("Manual Task").closest("div.border-b");
    expect(task1).not.toHaveClass("bg-primary/10");
  });

  it("calls setCurrentTask on task click", async () => {
    render(<TaskListManager roomId={"room-1" as any} tasks={mockTasks} currentTaskIndex={0} />);
    
    const task2 = screen.getByText("Jira Task");
    fireEvent.click(task2);
    
    await waitFor(() => {
      expect(mockSessionMutation).toHaveBeenCalledWith({ roomId: "room-1", taskIndex: 1 });
    });
  });

  it("calls deleteTask on delete button click", async () => {
    render(<TaskListManager roomId={"room-1" as any} tasks={mockTasks} currentTaskIndex={0} />);
    
    const deleteBtn = screen.getByLabelText("Delete task Manual Task");
    fireEvent.click(deleteBtn);
    
    await waitFor(() => {
      expect(mockSessionMutation).toHaveBeenCalledWith({ taskId: "task-1" });
    });
  });
});
