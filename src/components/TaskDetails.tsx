import type { JiraBlocker, JiraComment } from "@convex/jiraTypes";
import { ExternalLink, OctagonAlert } from "lucide-react";
import { Streamdown } from "streamdown";

import { streamdownComponents } from "@/components/DescriptionImage";
import { TaskComments } from "@/components/TaskComments";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface EnrichedDetails {
  title?: string;
  description?: string;
  url?: string;
  sprintName?: string;
  blockedBy?: JiraBlocker[];
}

interface TaskSummary {
  jiraKey?: string;
  title?: string;
}

interface TaskDetailsProps {
  task: TaskSummary;
  enriched: EnrichedDetails | undefined;
  jiraLoading: boolean;
  comments?: JiraComment[];
}

export function TaskDetails({ task, enriched, jiraLoading, comments = [] }: TaskDetailsProps) {
  const isLoadingDetails = jiraLoading && Boolean(task.jiraKey) && !enriched;

  return (
    <div className="w-full max-w-3xl">
      {isLoadingDetails ? (
        /* Blurred lorem-ipsum placeholder that mimics a real Jira ticket */
        <div className="select-none" aria-hidden="true">
          <h2 className="text-lg font-semibold blur-[6px]">
            {task.jiraKey && (
              <span className="text-muted-foreground font-normal whitespace-nowrap">
                {task.jiraKey}:&nbsp;
              </span>
            )}
            Lorem ipsum dolor sit amet consectetur
          </h2>
          <div className="mt-5 space-y-4 text-left text-[13px] blur-[6px]">
            <div>
              <h3 className="mb-1 text-base font-semibold">Description</h3>
              <p className="text-muted-foreground leading-relaxed">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor
                incididunt ut labore et dolore magna aliqua.
              </p>
            </div>
            <div>
              <h3 className="mb-1 text-base font-semibold">Acceptance criteria</h3>
              <ul className="text-muted-foreground list-disc space-y-1 pl-5">
                <li>Ut enim ad minim veniam quis nostrud exercitation</li>
                <li>Duis aute irure dolor in reprehenderit</li>
                <li>Excepteur sint occaecat cupidatat non proident</li>
              </ul>
            </div>
            <div>
              <h3 className="mb-1 text-base font-semibold">Stakeholders</h3>
              <p className="text-muted-foreground">@Lorem Ipsum @Dolor Sit</p>
            </div>
          </div>
        </div>
      ) : (
        /* Real content — fades in when ready */
        <div className="animate-in fade-in duration-300">
          <h2 className="text-lg font-semibold">
            {enriched?.url ? (
              <a
                href={enriched.url}
                target="_blank"
                rel="noopener noreferrer"
                className="underline-offset-2 hover:underline"
              >
                {task.jiraKey && (
                  <span className="text-muted-foreground font-normal whitespace-nowrap">
                    {task.jiraKey}:&nbsp;
                  </span>
                )}
                {enriched?.title ?? task.title ?? task.jiraKey}
                <ExternalLink className="text-muted-foreground ml-1 inline size-3.5 align-[-1px]" />
              </a>
            ) : (
              (enriched?.title ?? task.title ?? task.jiraKey ?? "Untitled")
            )}
          </h2>
          {enriched?.description && (
            <div className="mt-5 text-left text-sm">
              <Streamdown mode="static" components={streamdownComponents}>
                {enriched.description}
              </Streamdown>
            </div>
          )}
          {enriched?.blockedBy && enriched.blockedBy.length > 0 && (
            <div className="mt-5 text-sm">
              <Separator className="mb-5" />
              <div className="text-destructive flex items-center gap-1.5 font-medium">
                <OctagonAlert className="size-4" />
                Blocked by
              </div>
              <div className="mt-2 space-y-2">
                {enriched.blockedBy.map((blocker) => (
                  <a
                    key={blocker.key}
                    href={blocker.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="border-border bg-card hover:bg-accent flex items-center justify-between rounded-md border px-3 py-2 transition-colors"
                  >
                    <span className="flex items-center gap-1">
                      {blocker.key}: {blocker.summary}
                      <ExternalLink className="text-muted-foreground size-3" />
                    </span>
                    <Badge variant="outline" className="text-[10px] leading-tight">
                      {blocker.status}
                    </Badge>
                  </a>
                ))}
              </div>
            </div>
          )}
          <TaskComments comments={comments} />
        </div>
      )}
    </div>
  );
}
