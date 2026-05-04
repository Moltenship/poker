import { describe, expect, it } from "vitest";

import { TaskInfoBlock } from "@/components/TaskInfoBlock";
import { renderWithProviders, screen } from "@/test/utils";

const fullProps = {
  assignee: "Anna Quinn",
  assigneeAvatarUrl: "https://example.test/anna.png",
  reporter: "Bob Reed",
  reporterAvatarUrl: "https://example.test/bob.png",
  status: "In Progress",
  statusColor: "blue",
  sprintName: "Sprint 23",
  labels: ["frontend", "urgent"],
};

describe(TaskInfoBlock, () => {
  it("renders all five row headings when full data is provided", () => {
    renderWithProviders(<TaskInfoBlock {...fullProps} />);
    expect(screen.getByText("Assignee")).toBeInTheDocument();
    expect(screen.getByText("Reporter")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Sprint")).toBeInTheDocument();
    expect(screen.getByText("Labels")).toBeInTheDocument();
  });

  it("renders the assignee and reporter names", () => {
    renderWithProviders(<TaskInfoBlock {...fullProps} />);
    expect(screen.getByText("Anna Quinn")).toBeInTheDocument();
    expect(screen.getByText("Bob Reed")).toBeInTheDocument();
  });

  it("renders the status badge text", () => {
    renderWithProviders(<TaskInfoBlock {...fullProps} />);
    expect(screen.getByText("In Progress")).toBeInTheDocument();
  });

  it("renders the sprint name", () => {
    renderWithProviders(<TaskInfoBlock {...fullProps} />);
    expect(screen.getByText("Sprint 23")).toBeInTheDocument();
  });

  it("renders all label chips", () => {
    renderWithProviders(<TaskInfoBlock {...fullProps} />);
    expect(screen.getByText("frontend")).toBeInTheDocument();
    expect(screen.getByText("urgent")).toBeInTheDocument();
  });

  it("hides the Labels row when labels is empty", () => {
    renderWithProviders(<TaskInfoBlock {...fullProps} labels={[]} />);
    expect(screen.queryByText("Labels")).not.toBeInTheDocument();
  });

  it("renders Backlog when sprintName is undefined", () => {
    renderWithProviders(<TaskInfoBlock {...fullProps} sprintName={undefined} />);
    expect(screen.getByText("Backlog")).toBeInTheDocument();
  });

  it("renders Unassigned with no avatar image when assignee is undefined", () => {
    renderWithProviders(
      <TaskInfoBlock {...fullProps} assignee={undefined} assigneeAvatarUrl={undefined} />,
    );
    expect(screen.getByText("Unassigned")).toBeInTheDocument();
    expect(screen.queryByAltText("Anna Quinn")).not.toBeInTheDocument();
  });

  it("renders Unknown with no avatar image when reporter is undefined", () => {
    renderWithProviders(
      <TaskInfoBlock {...fullProps} reporter={undefined} reporterAvatarUrl={undefined} />,
    );
    expect(screen.getByText("Unknown")).toBeInTheDocument();
    expect(screen.queryByAltText("Bob Reed")).not.toBeInTheDocument();
  });

  it("applies the blue status palette via statusColorClass", () => {
    renderWithProviders(<TaskInfoBlock {...fullProps} statusColor="blue" />);
    const badge = screen.getByText("In Progress");
    expect(badge.className).toContain("blue");
  });

  it("renders avatar fallback initials when avatarUrl is missing but name is present", () => {
    renderWithProviders(<TaskInfoBlock {...fullProps} assigneeAvatarUrl={undefined} />);
    expect(screen.getByText("AQ")).toBeInTheDocument();
  });

  it("renders the blurred placeholder variant when placeholder is true", () => {
    const { container } = renderWithProviders(<TaskInfoBlock placeholder />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.getAttribute("aria-hidden")).toBe("true");
    expect(root.className).toContain("blur-");
    expect(root.className).toContain("select-none");
  });
});
