import { render, screen, fireEvent } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { BrowserRouter, useNavigate } from "react-router-dom"
import History from "../History"
import { useSessionQuery } from "@/hooks/useSession"

vi.mock("@/hooks/useSession", () => ({
  useSessionQuery: vi.fn(),
  useSessionMutation: vi.fn().mockReturnValue(vi.fn()),
  useSessionId: vi.fn().mockReturnValue("test-session-id"),
}))

const mockNavigate = vi.fn()
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom")
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

describe("History Page", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders skeleton/loading when query returns undefined", () => {
    vi.mocked(useSessionQuery).mockReturnValue(undefined)

    const { container } = render(
      <BrowserRouter>
        <History />
      </BrowserRouter>
    )
    
    const skeletons = container.querySelectorAll(".animate-pulse")
    expect(skeletons.length).toBe(3)
  })

  it("empty state shows helpful message when query returns []", () => {
    vi.mocked(useSessionQuery).mockReturnValue([])

    render(
      <BrowserRouter>
        <History />
      </BrowserRouter>
    )

    expect(screen.getByText("No rooms yet")).toBeInTheDocument()
    expect(
      screen.getByText("You haven't participated in any planning poker rooms recently.")
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Create a Room" })).toBeInTheDocument()
  })

  it("renders list of rooms from mock query and click navigates", () => {
    const mockRooms = [
      {
        _id: "room1" as const,
        name: "Sprint Planning",
        roomCode: "abcd123",
        cardSet: ["1", "2", "3", "5", "8"],
        status: "voting" as const,
        _creationTime: 1679904000000,
      },
      {
        _id: "room2" as const,
        name: "Backlog Refinement",
        roomCode: "xyz987",
        cardSet: ["S", "M", "L", "XL"],
        status: "lobby" as const,
        _creationTime: 1679817600000,
      }
    ]

    vi.mocked(useSessionQuery).mockReturnValue(mockRooms)

    render(
      <BrowserRouter>
        <History />
      </BrowserRouter>
    )

    expect(screen.getByText("Sprint Planning")).toBeInTheDocument()
    expect(screen.getByText("Backlog Refinement")).toBeInTheDocument()

    expect(screen.getByText("abcd123")).toBeInTheDocument()
    expect(screen.getByText("xyz987")).toBeInTheDocument()

    expect(screen.getByText("1, 2, 3...")).toBeInTheDocument()
    expect(screen.getByText("S, M, L...")).toBeInTheDocument()

    const room1Card = screen.getByText("Sprint Planning").closest(".cursor-pointer")
    expect(room1Card).toBeInTheDocument()
    
    if (room1Card) {
      fireEvent.click(room1Card)
      expect(mockNavigate).toHaveBeenCalledWith("/room/abcd123")
    }
  })
})
