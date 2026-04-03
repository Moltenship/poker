/** Sentinel value representing backlog (no sprint) in sprint filter arrays. */
export const BACKLOG_FILTER_ID = 0;

export interface JiraSprint {
  id: number;
  name: string;
  state: "active" | "future" | "closed";
}

export interface JiraIssue {
  key: string;
  title: string;
  status: string;
  type: string;
  url: string;
  description: string;
  sprintName?: string;
  assignee?: string;
  isBlocked: boolean;
  labels: string[];
}

export interface JiraTaskDetails {
  title: string;
  description: string;
  status: string;
  type: string;
  sprintName?: string;
  url: string;
  assignee?: string;
  isBlocked: boolean;
  labels: string[];
}

export interface JiraComment {
  id: string;
  authorName: string;
  avatarUrl: string;
  body: string;
  created: string;
}
