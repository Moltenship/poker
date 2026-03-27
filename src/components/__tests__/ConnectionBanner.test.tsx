import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { act } from "react";
import { ConnectionBanner } from "../ConnectionBanner";

let mockIsConnected = true;

vi.mock("convex/react", () => ({
  useConvexConnectionState: () => ({
    isWebSocketConnected: mockIsConnected,
    hasInflightRequests: false,
    timeOfOldestInflightRequest: null,
    hasEverConnected: true,
    numConnections: 1,
  }),
}));

describe("ConnectionBanner", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockIsConnected = true;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should not render when connected", () => {
    mockIsConnected = true;

    const { container } = render(<ConnectionBanner />);
    expect(container.firstChild).toBeNull();
  });

  it("should show disconnected banner when not connected", () => {
    mockIsConnected = false;

    render(<ConnectionBanner />);
    expect(
      screen.getByText(/Connection lost\. Reconnecting\.\.\./i)
    ).toBeInTheDocument();
  });

  it("should show reconnected banner when transitioning from disconnected to connected", () => {
    mockIsConnected = false;

    const { rerender } = render(<ConnectionBanner />);
    expect(
      screen.getByText(/Connection lost\. Reconnecting\.\.\./i)
    ).toBeInTheDocument();

    act(() => {
      mockIsConnected = true;
    });
    rerender(<ConnectionBanner />);

    expect(screen.getByText(/Back online!/i)).toBeInTheDocument();
  });

  it("should auto-hide reconnected banner after 3 seconds", () => {
    mockIsConnected = false;

    const { rerender } = render(<ConnectionBanner />);

    act(() => {
      mockIsConnected = true;
    });
    rerender(<ConnectionBanner />);

    expect(screen.getByText(/Back online!/i)).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(3001);
    });

    expect(screen.queryByText(/Back online!/i)).not.toBeInTheDocument();
  });
});
