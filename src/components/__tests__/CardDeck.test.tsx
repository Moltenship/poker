import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { CardDeck } from "../CardDeck";
import { useSessionMutation } from "@/hooks/useSession";
import { Id } from "../../../convex/_generated/dataModel";

vi.mock("@/hooks/useSession", () => ({
  useSessionMutation: vi.fn(),
}));

describe("CardDeck", () => {
  const mockCastVote = vi.fn().mockResolvedValue(undefined);
  const defaultProps = {
    cardSet: ["1", "2", "3", "5", "8", "?"],
    currentVote: null,
    roomStatus: "voting" as const,
    taskId: "task_123" as Id<"tasks">,
    participantId: "part_456" as Id<"participants">,
    onVoteChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useSessionMutation as any).mockReturnValue(mockCastVote);
  });

  it("renders the correct number of cards", () => {
    render(<CardDeck {...defaultProps} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(6);
    expect(buttons[0]).toHaveTextContent("1");
    expect(buttons[5]).toHaveTextContent("?");
  });

  it("calls castVote mutation when a card is clicked", () => {
    render(<CardDeck {...defaultProps} />);
    const card3 = screen.getByText("3");
    fireEvent.click(card3);
    
    expect(mockCastVote).toHaveBeenCalledWith({
      taskId: "task_123",
      participantId: "part_456",
      value: "3",
    });
    expect(defaultProps.onVoteChange).toHaveBeenCalledWith("3");
  });

  it("sets aria-pressed on the selected card", () => {
    render(<CardDeck {...defaultProps} currentVote="5" />);
    const card5 = screen.getByText("5").closest("button");
    const card8 = screen.getByText("8").closest("button");
    
    expect(card5).toHaveAttribute("aria-pressed", "true");
    expect(card8).toHaveAttribute("aria-pressed", "false");
  });

  it("disables cards when roomStatus is lobby", () => {
    render(<CardDeck {...defaultProps} roomStatus="lobby" />);
    const buttons = screen.getAllByRole("button");
    buttons.forEach((btn) => {
      expect(btn).toBeDisabled();
    });
  });

  it("disables cards when roomStatus is revealed", () => {
    render(<CardDeck {...defaultProps} roomStatus="revealed" />);
    const buttons = screen.getAllByRole("button");
    buttons.forEach((btn) => {
      expect(btn).toBeDisabled();
    });
  });
});
