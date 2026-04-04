import type { JiraComment } from "@convex/jiraTypes";
import { Streamdown } from "streamdown";

import { streamdownComponents } from "@/components/DescriptionImage";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

interface TaskCommentsProps {
  comments: JiraComment[];
}

function formatTimestamp(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function TaskComments({ comments }: TaskCommentsProps) {
  if (comments.length === 0) {
    return null;
  }

  return (
    <>
      <Separator className="mt-5 mb-5" />
      <div className="mt-5 text-left text-[13px]">
        <div className="space-y-4">
          {comments.map((comment) => (
            <div key={comment.id} className="flex gap-3">
              <Avatar className="size-8">
                <AvatarImage src={comment.avatarUrl} alt={comment.authorName} />
                <AvatarFallback className="text-xs">
                  {getInitials(comment.authorName)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-[13px] font-medium">{comment.authorName}</span>
                  <span className="text-muted-foreground text-xs">
                    {formatTimestamp(comment.created)}
                  </span>
                </div>
                <div className="text-muted-foreground mt-1">
                  <Streamdown mode="static" components={streamdownComponents}>
                    {comment.body}
                  </Streamdown>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
