import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { statusColorClass } from "@/lib/jiraStatus";
import { cn } from "@/lib/utils";

interface TaskInfoBlockProps {
  assignee?: string;
  assigneeAvatarUrl?: string;
  reporter?: string;
  reporterAvatarUrl?: string;
  status?: string;
  statusColor?: string;
  sprintName?: string;
  labels?: string[];
  /** When true, render a blurred lorem-ipsum placeholder for the loading state. */
  placeholder?: boolean;
}

const PLACEHOLDER_PROPS: Omit<TaskInfoBlockProps, "placeholder"> = {
  assignee: "Lorem Ipsum",
  reporter: "Dolor Sit",
  status: "In Progress",
  statusColor: "blue",
  sprintName: "Sprint 99",
  labels: ["lorem", "ipsum", "dolor"],
};

/**
 * Compute up to two uppercase initials from a display name.
 * "Anna Quinn"   -> "AQ"
 * "Madonna"      -> "M"
 * ""             -> ""
 */
function initialsOf(name: string | undefined): string {
  if (!name) {
    return "";
  }
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "";
  }
  const first = parts[0]?.[0] ?? "";
  const second = parts[1]?.[0] ?? "";
  return (first + second).toUpperCase();
}

interface PersonCellProps {
  name: string | undefined;
  avatarUrl: string | undefined;
  emptyLabel: string;
}

function PersonCell({ name, avatarUrl, emptyLabel }: PersonCellProps) {
  if (!name) {
    return <span className="text-muted-foreground italic">{emptyLabel}</span>;
  }
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <Avatar size="sm" className="size-5">
        {avatarUrl ? <AvatarImage src={avatarUrl} alt={name} /> : null}
        <AvatarFallback>{initialsOf(name)}</AvatarFallback>
      </Avatar>
      <span className="truncate">{name}</span>
    </span>
  );
}

export function TaskInfoBlock(props: TaskInfoBlockProps) {
  const isPlaceholder = props.placeholder === true;
  const data: Omit<TaskInfoBlockProps, "placeholder"> = isPlaceholder ? PLACEHOLDER_PROPS : props;
  const labels = data.labels ?? [];
  const showLabels = labels.length > 0;

  return (
    <dl
      className={cn(
        "mt-4 grid grid-cols-[88px_1fr] items-center gap-x-4 gap-y-1.5 text-sm",
        isPlaceholder && "blur-[6px] select-none",
      )}
      aria-hidden={isPlaceholder || undefined}
    >
      <dt className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        Assignee
      </dt>
      <dd className="min-w-0">
        <PersonCell
          name={data.assignee}
          avatarUrl={data.assigneeAvatarUrl}
          emptyLabel="Unassigned"
        />
      </dd>

      <dt className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        Reporter
      </dt>
      <dd className="min-w-0">
        <PersonCell name={data.reporter} avatarUrl={data.reporterAvatarUrl} emptyLabel="Unknown" />
      </dd>

      <dt className="text-muted-foreground text-xs font-medium tracking-wide uppercase">Status</dt>
      <dd className="min-w-0">
        <Badge
          variant="outline"
          className={cn("text-xs leading-tight", statusColorClass(data.statusColor))}
        >
          {data.status || "—"}
        </Badge>
      </dd>

      <dt className="text-muted-foreground text-xs font-medium tracking-wide uppercase">Sprint</dt>
      <dd className="min-w-0">
        {data.sprintName ? (
          <span className="truncate">{data.sprintName}</span>
        ) : (
          <span className="text-muted-foreground italic">Backlog</span>
        )}
      </dd>

      {showLabels && (
        <>
          <dt className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Labels
          </dt>
          <dd className="min-w-0">
            <div className="flex flex-wrap gap-1">
              {labels.map((label) => (
                <span
                  key={label}
                  className="bg-primary/10 text-primary rounded px-1 py-px text-[10px] leading-tight"
                >
                  {label}
                </span>
              ))}
            </div>
          </dd>
        </>
      )}
    </dl>
  );
}
