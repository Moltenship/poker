import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Id } from "../../../convex/_generated/dataModel";
import { IdentityFlow } from "../IdentityFlow";
import { useIdentity } from "@/hooks/useIdentity";
import { useSessionMutation, useSessionQuery } from "@/hooks/useSession";

const { mockJoinRoomRef, mockTakeoverSessionRef } = vi.hoisted(() => ({
  mockJoinRoomRef: { _mockName: "joinRoom" },
  mockTakeoverSessionRef: { _mockName: "takeoverSession" },
}));

vi.mock("../../../convex/_generated/api", () => ({
  api: {
    participants: {
      joinRoom: mockJoinRoomRef,
      takeoverSession: mockTakeoverSessionRef,
      listRoomParticipants: { _mockName: "listRoomParticipants" },
    },
  },
}));

vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn().mockReturnValue(vi.fn()),
}));

vi.mock("@/hooks/useSession", () => ({
  useSessionMutation: vi.fn(),
  useSessionQuery: vi.fn(),
  useSessionId: vi.fn().mockReturnValue("test-session-id"),
}));

vi.mock("@/hooks/useIdentity", () => ({
  useIdentity: vi.fn(),
}));

describe("IdentityFlow", () => {
  const joinRoom = vi.fn();
  const takeoverSession = vi.fn();
  const onIdentitySet = vi.fn();
  const baseProps = {
    roomId: "room_123" as Id<"rooms">,
    roomCode: "ROOM123",
    onIdentitySet,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useIdentity).mockReturnValue({
      participantId: null,
      displayName: null,
      setIdentity: vi.fn(),
      clearIdentity: vi.fn(),
    });

    vi.mocked(useSessionMutation).mockImplementation((mutationRef: unknown) => {
      if (mutationRef === mockJoinRoomRef) {
        return joinRoom;
      }

      if (mutationRef === mockTakeoverSessionRef) {
        return takeoverSession;
      }

      return vi.fn();
    });

    vi.mocked(useSessionQuery).mockReturnValue([
      { _id: "p1", displayName: "Alice" },
      { _id: "p2", displayName: "Bob" },
    ] as never);
  });

  it("shows name input and joins a new user", async () => {
    joinRoom.mockResolvedValueOnce("p3");
    const user = userEvent.setup();

    render(<IdentityFlow {...baseProps} />);

    expect(screen.getByText(/join this room/i)).toBeInTheDocument();
    const input = screen.getByLabelText(/what's your name\?/i);
    await user.type(input, "Charlie");
    await user.click(screen.getByRole("button", { name: /^join$/i }));

    await waitFor(() => {
      expect(joinRoom).toHaveBeenCalledWith({
        roomId: "room_123",
        displayName: "Charlie",
      });
    });

    expect(onIdentitySet).toHaveBeenCalledWith("p3", "Charlie");
  });

  it("shows participant dropdown when returning user mode is enabled", async () => {
    const user = userEvent.setup();

    render(<IdentityFlow {...baseProps} />);

    expect(screen.queryByRole("combobox", { name: /your name/i })).not.toBeInTheDocument();
    await user.click(screen.getByLabelText(/i've joined this room before/i));

    expect(screen.getByRole("combobox", { name: /your name/i })).toBeInTheDocument();

    await user.click(screen.getByRole("combobox", { name: /your name/i }));

    expect(await screen.findByRole("option", { name: "Alice" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Bob" })).toBeInTheDocument();
  });

  it("asks for confirmation before taking over a returning user session", async () => {
    takeoverSession.mockResolvedValueOnce(undefined);
    const user = userEvent.setup();

    render(<IdentityFlow {...baseProps} />);

    await user.click(screen.getByLabelText(/i've joined this room before/i));
    await user.click(screen.getByRole("combobox", { name: /your name/i }));
    await user.click(screen.getByRole("option", { name: "Alice" }));
    expect(screen.getByRole("combobox", { name: /your name/i })).toHaveTextContent("p1");
    await user.click(screen.getByRole("button", { name: /rejoin and disconnect other session/i }));

    expect(screen.getByText(/this will disconnect your other session/i)).toBeInTheDocument();
    expect(takeoverSession).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /^continue$/i }));

    await waitFor(() => {
      expect(takeoverSession).toHaveBeenCalledWith({
        roomId: "room_123",
        targetParticipantId: "p1",
      });
    });

    expect(onIdentitySet).toHaveBeenCalledWith("p1", "Alice");
  });

  it("does not render the modal when identity already exists", () => {
    vi.mocked(useIdentity).mockReturnValue({
      participantId: "p1" as Id<"participants">,
      displayName: "Alice",
      setIdentity: vi.fn(),
      clearIdentity: vi.fn(),
    });

    render(<IdentityFlow {...baseProps} />);

    expect(screen.queryByText(/join this room/i)).not.toBeInTheDocument();
    expect(joinRoom).not.toHaveBeenCalled();
  });
});
