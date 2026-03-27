const fs = require('fs');

const cleanCode = `import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { useQuery } from "convex/react"
import { useSessionMutation, useSessionId } from "@/hooks/useSession"
import Room from "../Room"

vi.mock("../../convex/_generated/api", () => ({
  api: {
    rooms: { getRoom: "rooms.getRoom" },
    tasks: { getTasksForRoom: "tasks.getTasksForRoom", getCurrentTask: "tasks.getCurrentTask" },
    participants: { getParticipants: "participants.getParticipants" },
    voting: { getVoteStatus: "voting.getVoteStatus" },
    jira: { getImportStatus: "jira.getImportStatus" },
  }
}))

vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn().mockReturnValue(vi.fn()),
}))

vi.mock("@/hooks/useSession", () => ({
  useSessionMutation: vi.fn().mockReturnValue(vi.fn()),
  useSessionQuery: vi.fn().mockReturnValue(null),
  useSessionId: vi.fn().mockReturnValue("test-session-id"),
}))

const mockRoom = {
  _id: "room123",
  name: "Test Room",
  roomCode: "TESTCODE",
  cardSet: ["1", "2", "3"],
  status: "lobby",
  currentTaskIndex: 0,
  createdBy: "test-session-id",
}

const mockTasks = [
  { _id: "task1", roomId: "room123", title: "Task 1", order: 1, isManual: true },
  { _id: "task2", roomId: "room123", title: "Task 2", order: 2, isManual: true },
]

const mockParticipants = [
  { _id: "p1", roomId: "room123", sessionId: "test-session-id", displayName: "Alice", isConnected: true },
  { _id: "p2", roomId: "room123", sessionId: "other-session", displayName: "Bob", isConnected: true },
]

function renderWithRouter(initialEntry: string) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/room/:roomCode" element={<Room />} />
      </Routes>
    </MemoryRouter>
  )
}

describe("Room Layout", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useSessionId).mockReturnValue("test-session-id")
  })

  it("renders loading state when room data is undefined", () => {
    vi.mocked(useQuery).mockReturnValue(undefined)
    
    renderWithRouter("/room/TESTCODE")
    expect(screen.getByTestId("room-loading")).toBeInTheDocument()
  })

  it("renders 'Room not found' when room is null", () => {
    vi.mocked(useQuery).mockImplementation((...argsArray: any[]) => {
      const query = argsArray[0] as string;
      if (query === "rooms.getRoom") return null;
      return undefined;
    })

    renderWithRouter("/room/TESTCODE")
    expect(screen.getByText(/room not found/i)).toBeInTheDocument()
  })

  describe("when room data is loaded", () => {
    beforeEach(() => {
      vi.mocked(useQuery).mockImplementation((...argsArray: any[]) => {
        const query = argsArray[0] as string;
        const args = argsArray[1];
        if (args === "skip") return undefined;
        if (query === "rooms.getRoom") return mockRoom;
        if (query === "tasks.getTasksForRoom") return mockTasks;
        if (query === "tasks.getCurrentTask") return mockTasks[0];
        if (query === "participants.getParticipants") return mockParticipants;
        if (query === "voting.getVoteStatus") return [];
        return undefined;
      });
    })

    it("shows inline name prompt when no participant matches session", () => {
      vi.mocked(useQuery).mockImplementation((...argsArray: any[]) => {
        const query = argsArray[0] as string;
        const args = argsArray[1];
        if (args === "skip") return undefined;
        if (query === "rooms.getRoom") return mockRoom;
        if (query === "tasks.getTasksForRoom") return mockTasks;
        if (query === "tasks.getCurrentTask") return mockTasks[0];
        if (query === "participants.getParticipants") return [{ _id: "p2", roomId: "room123", sessionId: "other-session", displayName: "Bob", isConnected: true }];
        return undefined;
      });

      renderWithRouter("/room/TESTCODE")
      
      expect(screen.getByText(/Enter your name/i)).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /Join/i })).toBeInTheDocument()
    })

    it("renders the 3-panel layout when joined", () => {
      renderWithRouter("/room/TESTCODE")
      
      expect(screen.getByTestId("task-sidebar")).toBeInTheDocument()
      expect(screen.getByText("Task 1")).toBeInTheDocument()
      
      expect(screen.getByTestId("room-lobby")).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /Start Voting/i })).toBeInTheDocument()
      
      expect(screen.getByTestId("participant-list")).toBeInTheDocument()
      expect(screen.getByText("Alice")).toBeInTheDocument()
      expect(screen.getByText("Bob")).toBeInTheDocument()
    })

    it("Start Voting button is enabled when there are tasks and participants", () => {
      renderWithRouter("/room/TESTCODE")
      const btn = screen.getByRole("button", { name: /Start Voting/i })
      expect(btn).not.toBeDisabled()
    })

    it("Start Voting button is disabled when no tasks", () => {
      vi.mocked(useQuery).mockImplementation((...argsArray: any[]) => {
        const query = argsArray[0] as string;
        const args = argsArray[1];
        if (args === "skip") return undefined;
        if (query === "rooms.getRoom") return mockRoom;
        if (query === "tasks.getTasksForRoom") return [];
        if (query === "participants.getParticipants") return mockParticipants;
        return undefined;
      });

      renderWithRouter("/room/TESTCODE")
      const btn = screen.getByRole("button", { name: /Start Voting/i })
      expect(btn).toBeDisabled()
    })

    it("renders voting placeholder when status is voting", () => {
      vi.mocked(useQuery).mockImplementation((...argsArray: any[]) => {
        const query = argsArray[0] as string;
        const args = argsArray[1];
        if (args === "skip") return undefined;
        if (query === "rooms.getRoom") return { ...mockRoom, status: "voting" };
        if (query === "tasks.getTasksForRoom") return mockTasks;
        if (query === "tasks.getCurrentTask") return mockTasks[0];
        if (query === "participants.getParticipants") return mockParticipants;
        return undefined;
      });

      renderWithRouter("/room/TESTCODE")
      expect(screen.getByTestId("voting-area")).toBeInTheDocument()
    })

    it("renders results placeholder when status is revealed", () => {
      vi.mocked(useQuery).mockImplementation((...argsArray: any[]) => {
        const query = argsArray[0] as string;
        const args = argsArray[1];
        if (args === "skip") return undefined;
        if (query === "rooms.getRoom") return { ...mockRoom, status: "revealed" };
        if (query === "tasks.getTasksForRoom") return mockTasks;
        if (query === "tasks.getCurrentTask") return mockTasks[0];
        if (query === "participants.getParticipants") return mockParticipants;
        if (query === "voting.getVoteStatus") return [];
        return undefined;
      });

      renderWithRouter("/room/TESTCODE")
      expect(screen.getByTestId("results-area")).toBeInTheDocument()
    })
  })
})
`;

fs.writeFileSync('src/pages/__tests__/Room.test.tsx', cleanCode);
