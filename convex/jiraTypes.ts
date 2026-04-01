/** Sentinel value representing backlog (no sprint) in sprint filter arrays. */
export const BACKLOG_FILTER_ID = 0;

export type JiraSprint = {
  id: number;
  name: string;
  state: "active" | "future" | "closed";
};

export type JiraIssue = {
  key: string;
  title: string;
  status: string;
  type: string;
  url: string;
  description: string;
  sprintName?: string;
  assignee?: string;
  isBlocked: boolean;
};

export type JiraTaskDetails = {
  title: string;
  description: string;
  status: string;
  type: string;
  sprintName?: string;
  url: string;
  assignee?: string;
  isBlocked: boolean;
};
