import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { vi, describe, it, expect, beforeEach } from "vitest"
import { JiraImportModal } from "../JiraImportModal"
import { useQuery } from "convex/react"
import { useSessionMutation } from "@/hooks/useSession"

vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
}))

vi.mock("@/hooks/useSession", () => ({
  useSessionMutation: vi.fn(),
}))

describe("JiraImportModal", () => {
  const mockOnClose = vi.fn()
  const mockTriggerImport = vi.fn()

  const defaultProps = {
    roomId: "room123" as any,
    isOpen: true,
    onClose: mockOnClose,
    hasExistingTasks: false,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useQuery).mockReturnValue({ status: "idle" })
    vi.mocked(useSessionMutation).mockReturnValue(mockTriggerImport)
  })

  it("renders form with project key input and JQL textarea", () => {
    render(<JiraImportModal {...defaultProps} />)
    
    expect(screen.getByText("Import from Jira")).toBeInTheDocument()
    expect(screen.getByPlaceholderText("e.g. PROJ")).toBeInTheDocument()
    expect(screen.getByPlaceholderText("sprint is EMPTY AND statusCategory != Done")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Import" })).toBeInTheDocument()
  })

  it("shows re-import warning when hasExistingTasks=true", () => {
    render(<JiraImportModal {...defaultProps} hasExistingTasks={true} />)
    expect(screen.getByText(/Re-import will update existing tasks\. New tasks will be added\./i)).toBeInTheDocument()
  })

  it("does NOT show warning when hasExistingTasks=false", () => {
    render(<JiraImportModal {...defaultProps} hasExistingTasks={false} />)
    expect(screen.queryByText(/Re-import will update existing tasks/i)).not.toBeInTheDocument()
  })

  it("import button calls triggerJiraImport mutation", async () => {
    render(<JiraImportModal {...defaultProps} />)
    
    const projectKeyInput = screen.getByPlaceholderText("e.g. PROJ")
    const jqlInput = screen.getByPlaceholderText("sprint is EMPTY AND statusCategory != Done")
    const submitButton = screen.getByRole("button", { name: "Import" })

    fireEvent.change(projectKeyInput, { target: { value: "BOARD" } })
    fireEvent.change(jqlInput, { target: { value: "status = Open" } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockTriggerImport).toHaveBeenCalledWith({
        roomId: "room123",
        projectKey: "BOARD",
        jqlFilter: "status = Open",
      })
    })
  })

  it("shows loading state when import is in progress", () => {
    vi.mocked(useQuery).mockReturnValue({ status: "importing" })
    render(<JiraImportModal {...defaultProps} />)
    
    expect(screen.getByText("Importing tasks from Jira...")).toBeInTheDocument()
    expect(screen.getByTestId("loading-spinner")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Import" })).not.toBeInTheDocument()
  })

  it("shows error state when importStatus=error with error message", () => {
    vi.mocked(useQuery).mockReturnValue({ status: "error", error: "Failed to connect to Jira" })
    render(<JiraImportModal {...defaultProps} />)
    
    expect(screen.getByText("Failed to connect to Jira")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Try Again" })).toBeInTheDocument()
  })

  it("shows success state when importStatus=success", () => {
    vi.mocked(useQuery).mockReturnValue({ status: "success", taskCount: 5 })
    render(<JiraImportModal {...defaultProps} />)
    
    expect(screen.getByText("Import complete!")).toBeInTheDocument()
    expect(screen.getByText(/Imported successfully/i)).toBeInTheDocument()
    expect(screen.getByText(/5/)).toBeInTheDocument()
    expect(screen.getAllByRole("button", { name: "Close" }).length).toBeGreaterThan(0)
  })

  it("Try Again button resets to idle state locally when in error", async () => {
    // Initial render with error state
    const { rerender } = render(<JiraImportModal {...defaultProps} />)
    
    // Simulate query returning error
    vi.mocked(useQuery).mockReturnValue({ status: "error", error: "Jira timeout" })
    rerender(<JiraImportModal {...defaultProps} />)
    
    const tryAgainButton = screen.getByRole("button", { name: "Try Again" })
    fireEvent.click(tryAgainButton)
    
    // It should reset to idle UI
    expect(screen.getByPlaceholderText("e.g. PROJ")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Import" })).toBeInTheDocument()
  })
})
