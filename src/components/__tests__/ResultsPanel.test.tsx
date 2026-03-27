import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ResultsPanel } from "../ResultsPanel";
import type { Id } from "../../../convex/_generated/dataModel";

vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn().mockReturnValue(vi.fn()),
}));

vi.mock("@/hooks/useSession", () => ({
  useSessionMutation: vi.fn(),
}));

import { useQuery } from "convex/react";
import { useSessionMutation } from "@/hooks/useSession";

describe("ResultsPanel", () => {
  const mockMutation = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useSessionMutation as any).mockReturnValue(mockMutation);
  });

  const defaultProps = {
    roomId: "room123" as Id<"rooms">,
    taskId: "task123" as Id<"tasks">,
    cardSet: ["1", "2", "3", "5", "8", "13", "21"],
    participantCount: 3,
    votedCount: 2,
  };

  it("pre-reveal: renders 'Reveal Votes' button and vote count", () => {
    (useQuery as any).mockReturnValue(null);

    render(<ResultsPanel {...defaultProps} roomStatus="voting" />);

    expect(screen.getByText("2 of 3 voted")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reveal Votes" })).toBeInTheDocument();
    expect(screen.queryByText("Average:")).not.toBeInTheDocument();
    
    fireEvent.click(screen.getByRole("button", { name: "Reveal Votes" }));
    expect(mockMutation).toHaveBeenCalledWith({ roomId: "room123" });
  });

  it("pre-reveal: does NOT show vote values", () => {
    (useQuery as any).mockReturnValue(null);

    render(<ResultsPanel {...defaultProps} roomStatus="voting" />);

    expect(screen.queryByText("Individual Votes")).not.toBeInTheDocument();
    expect(screen.queryByText("Vote Distribution")).not.toBeInTheDocument();
  });

  it("post-reveal: shows all vote values and average", () => {
    (useQuery as any).mockImplementation((_queryFn: any, args: any) => {
      if (args === "skip") return null;
      if (args?.taskId && args?.roomId) {
        return {
          votes: [
            { participantId: "p1", value: "5" },
            { participantId: "p2", value: "8" },
          ],
          average: 6.5,
          numericCount: 2,
          totalVotes: 2,
        };
      }
      if (args?.roomId && !args?.taskId) {
        return [
          { _id: "p1", displayName: "Alice" },
          { _id: "p2", displayName: "Bob" },
        ];
      }
      return null;
    });

    render(<ResultsPanel {...defaultProps} roomStatus="revealed" />);

    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getAllByText("5").length).toBeGreaterThan(0);
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getAllByText("8").length).toBeGreaterThan(0);
    
    expect(screen.getByText("Average: 6.5")).toBeInTheDocument();
    expect(screen.getByText("Suggested estimate: 5")).toBeInTheDocument();
  });

  it("post-reveal: shows 'N/A' when all non-numeric", () => {
    (useQuery as any).mockImplementation((_queryFn: any, args: any) => {
      if (args === "skip") return null;
      if (args?.taskId && args?.roomId) {
        return {
          votes: [
            { participantId: "p1", value: "?" },
            { participantId: "p2", value: "☕" },
          ],
          average: null,
          numericCount: 0,
          totalVotes: 2,
        };
      }
      if (args?.roomId && !args?.taskId) {
        return [
          { _id: "p1", displayName: "Alice" },
          { _id: "p2", displayName: "Bob" },
        ];
      }
      return null;
    });

    render(<ResultsPanel {...defaultProps} roomStatus="revealed" />);

    expect(screen.getByText("Average: N/A")).toBeInTheDocument();
    expect(screen.queryByText(/Suggested estimate:/)).not.toBeInTheDocument();
  });

  it("post-reveal: renders action buttons correctly", () => {
    (useQuery as any).mockReturnValue(null);

    render(<ResultsPanel {...defaultProps} roomStatus="revealed" />);

    const resetBtn = screen.getByRole("button", { name: "Reset & Re-vote" });
    const nextBtn = screen.getByRole("button", { name: "Next Task →" });

    expect(resetBtn).toBeInTheDocument();
    expect(nextBtn).toBeInTheDocument();

    fireEvent.click(resetBtn);
    expect(mockMutation).toHaveBeenCalledWith({ roomId: "room123" });

    fireEvent.click(nextBtn);
    expect(mockMutation).toHaveBeenCalledWith({ roomId: "room123" });
  });
});

