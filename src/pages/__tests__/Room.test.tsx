import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { useQuery } from "convex/react"
import { useSessionId, useSessionMutation } from "@/hooks/useSession"
import { useIdentity } from "@/hooks/useIdentity"
import Room from "../Room"
import type { Id } from "../../../convex/_generated/dataModel"

vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn().mockReturnValue(vi.fn()),
}))

vi.mock("@/hooks/useSession", () => ({
  useSessionMutation: vi.fn().mockReturnValue(vi.fn()),
  useSessionQuery: vi.fn().mockReturnValue(null),
  useSessionId: vi.fn().mockReturnValue("test-session-id"),
}))

vi.mock("@/hooks/useIdentity", () => ({
  useIdentity: vi.fn(),
}))

vi.mock("@/components/IdentityFlow", () => ({
  IdentityFlow: () => <div data-testid="identity-flow">Identity Flow</div>,
}))

vi.mock("@/components/SessionKickedBanner", () => ({
  SessionKickedBanner: () => <div data-testid="session-kicked-banner">Session Kicked Banner</div>,
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
  const mockJoinRoom = vi.fn().mockResolvedValue("p1")
  const mockTakeoverSession = vi.fn().mockResolvedValue(undefined)
  const mockStartVoting = vi.fn().mockResolvedValue(undefined)
  let mutationCallCount = 0

  beforeEach(() => {
    vi.resetAllMocks()
    mutationCallCount = 0
    vi.mocked(useSessionId).mockReturnValue("test-session-id")
    mockJoinRoom.mockResolvedValue("p1")
    vi.mocked(useSessionMutation).mockImplementation(() => {
      mutationCallCount += 1
      const slot = mutationCallCount % 3

      if (slot === 1) {
        return mockJoinRoom
      }

      if (slot === 2) {
        return mockTakeoverSession
      }

      return mockStartVoting
    })
    vi.mocked(useIdentity).mockReturnValue({
      participantId: "p1" as Id<"participants">,
      displayName: "Alice",
      setIdentity: vi.fn(),
      clearIdentity: vi.fn(),
    })
  })

  it("renders loading state when room data is undefined", () => {
    vi.mocked(useQuery).mockReturnValue(undefined)
    
    renderWithRouter("/room/TESTCODE")
    expect(screen.getByTestId("room-loading")).toBeInTheDocument()
  })

  it("renders 'Room not found' when room is null", () => {
    vi.mocked(useQuery).mockImplementation((...argsArray: any[]) => {
      const args = argsArray[1];
      if (typeof args === 'object' && args !== null && 'roomCode' in args) return null;
      return undefined;
    })

    renderWithRouter("/room/TESTCODE")
    expect(screen.getByText(/room not found/i)).toBeInTheDocument()
  })

  describe("when room data is loaded", () => {
    beforeEach(() => {
      let taskQueryCount = 0;
      vi.mocked(useQuery).mockImplementation((...argsArray: any[]) => {
        const args = argsArray[1];
        if (args === "skip") return undefined;
        if (typeof args === 'object' && args !== null) {
          if ('roomCode' in args) return mockRoom;
          if ('taskId' in args) return [];
          if ('roomId' in args) {
            taskQueryCount++;
            if (taskQueryCount % 2 === 1) return mockTasks;
            return mockParticipants;
          }
        }
        return undefined;
      });
    })

    it("shows identity flow overlay when there is no stored identity", () => {
      vi.mocked(useIdentity).mockReturnValue({
        participantId: null,
        displayName: null,
        setIdentity: vi.fn(),
        clearIdentity: vi.fn(),
      })

      renderWithRouter("/room/TESTCODE")

      expect(screen.getByTestId("identity-flow")).toBeInTheDocument()
    })

    it("renders the 3-panel layout when joined", () => {
      renderWithRouter("/room/TESTCODE")
      
      expect(screen.getByTestId("task-sidebar")).toBeInTheDocument()
      expect(screen.getByText("Task 1")).toBeInTheDocument()
      
      expect(screen.getByTestId("room-lobby")).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /Start Voting/i })).toBeInTheDocument()
      
      expect(screen.getByTestId("participant-list")).toBeInTheDocument()
      expect(screen.getByTestId("session-kicked-banner")).toBeInTheDocument()
      expect(screen.getByText("Alice")).toBeInTheDocument()
      expect(screen.getByText("Bob")).toBeInTheDocument()
    })

    it("auto-rejoins when a stored identity exists", async () => {
      renderWithRouter("/room/TESTCODE")

      await waitFor(() => {
        expect(mockJoinRoom).toHaveBeenCalledWith({
          roomId: "room123",
          displayName: "Alice",
        })
      })
    })

    it("Start Voting button is enabled when there are tasks and participants", () => {
      renderWithRouter("/room/TESTCODE")
      const btn = screen.getByRole("button", { name: /Start Voting/i })
      expect(btn).not.toBeDisabled()
    })

    it("Start Voting button is disabled when no tasks", () => {
      let taskQueryCount = 0;
      vi.mocked(useQuery).mockImplementation((...argsArray: any[]) => {
        const args = argsArray[1];
        if (args === "skip") return undefined;
        if (typeof args === 'object' && args !== null) {
          if ('roomCode' in args) return mockRoom;
          if ('taskId' in args) return [];
          if ('roomId' in args) {
            taskQueryCount++;
            if (taskQueryCount % 2 === 1) return []; // no tasks
            return mockParticipants;
          }
        }
        return undefined;
      });

      renderWithRouter("/room/TESTCODE")
      const btn = screen.getByRole("button", { name: /Start Voting/i })
      expect(btn).toBeDisabled()
    })

    it("renders voting placeholder when status is voting", () => {
      let taskQueryCount = 0;
      vi.mocked(useQuery).mockImplementation((...argsArray: any[]) => {
        const args = argsArray[1];
        if (args === "skip") return undefined;
        if (typeof args === 'object' && args !== null) {
          if ('roomCode' in args) return { ...mockRoom, status: "voting" };
          if ('taskId' in args) return [];
          if ('roomId' in args) {
            taskQueryCount++;
            if (taskQueryCount % 2 === 1) return mockTasks;
            return mockParticipants;
          }
        }
        return undefined;
      });

      renderWithRouter("/room/TESTCODE")
      expect(screen.getByTestId("voting-area")).toBeInTheDocument()
    })

    it("renders results placeholder when status is revealed", () => {
      let taskQueryCount = 0;
      vi.mocked(useQuery).mockImplementation((...argsArray: any[]) => {
        const args = argsArray[1];
        if (args === "skip") return undefined;
        if (typeof args === 'object' && args !== null) {
          if ('roomCode' in args) return { ...mockRoom, status: "revealed" };
          if ('taskId' in args) return [];
          if ('roomId' in args) {
            taskQueryCount++;
            if (taskQueryCount % 2 === 1) return mockTasks;
            return mockParticipants;
          }
        }
        return undefined;
      });

      renderWithRouter("/room/TESTCODE")
      expect(screen.getByTestId("results-area")).toBeInTheDocument()
    })
  })
})
