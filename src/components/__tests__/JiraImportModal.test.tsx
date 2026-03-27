import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { vi, describe, it, expect, beforeEach } from "vitest"
import { JiraImportModal } from "../JiraImportModal"
import { useMutation } from "convex/react"

vi.mock("convex/react", () => ({
  useMutation: vi.fn(),
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
    vi.mocked(useMutation).mockReturnValue(mockTriggerImport as any)
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

  it("import button calls importFromJira mutation", async () => {
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
        jql: "status = Open",
      })
    })
  })

  it("shows loading state when import is in progress", () => {
    render(<JiraImportModal {...defaultProps} importStatus="loading" />)
    
    expect(screen.getByText("Importing tasks from Jira...")).toBeInTheDocument()
    expect(screen.getByTestId("loading-spinner")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Import" })).not.toBeInTheDocument()
  })

  it("shows error state when importStatus=error with error message", () => {
    render(<JiraImportModal {...defaultProps} importStatus="error" importError="Failed to connect to Jira" />)
    
    expect(screen.getByText("Failed to connect to Jira")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Try Again" })).toBeInTheDocument()
  })

  it("shows success state when importStatus=success", () => {
    render(<JiraImportModal {...defaultProps} importStatus="success" />)
    
    expect(screen.getByText("Import complete!")).toBeInTheDocument()
    expect(screen.getByText(/Imported successfully/i)).toBeInTheDocument()
    expect(screen.getAllByRole("button", { name: "Close" }).length).toBeGreaterThan(0)
  })

  it("Try Again button resets to idle state locally when in error", async () => {
    render(<JiraImportModal {...defaultProps} importStatus="error" importError="Jira timeout" />)
    
    const tryAgainButton = screen.getByRole("button", { name: "Try Again" })
    fireEvent.click(tryAgainButton)
    
    // It should reset to idle UI
    expect(screen.getByPlaceholderText("e.g. PROJ")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Import" })).toBeInTheDocument()
  })
})
