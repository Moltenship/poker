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
  reporter?: string;
  isBlocked: boolean;
  labels: string[];
}

export interface JiraBlocker {
  key: string;
  summary: string;
  status: string;
  statusColor?: string;
  typeIconUrl?: string;
  url: string;
}

export interface JiraTaskDetails {
  assignee?: string;
  assigneeAvatarUrl?: string;
  blockedBy: JiraBlocker[];
  created?: string;
  description: string;
  isBlocked: boolean;
  labels: string[];
  reporter?: string;
  reporterAvatarUrl?: string;
  sprintName?: string;
  status: string;
  statusColor?: string;
  title: string;
  type: string;
  updated?: string;
  url: string;
}

export interface JiraComment {
  id: string;
  authorName: string;
  avatarUrl: string;
  body: string;
  created: string;
}
