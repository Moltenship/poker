import { Check, CircleDashed } from "lucide-react";

interface VoteIndicatorProps {
  participants: Array<{ _id: string; displayName: string; hasVoted: boolean }>;
}

export function VoteIndicator({ participants }: VoteIndicatorProps) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border bg-white p-4 shadow-sm">
      <h3 className="mb-2 text-sm font-medium text-slate-500">Votes</h3>
      <ul className="flex flex-col gap-2">
        {participants.map((p) => (
          <li key={p._id} className="flex items-center justify-between gap-3 text-sm">
            <span className="font-medium text-slate-700">{p.displayName}</span>
            <span
              className={`flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${
                p.hasVoted
                  ? "bg-green-100 text-green-700"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              {p.hasVoted ? (
                <>
                  <Check className="h-3 w-3" strokeWidth={2.5} />
                  Voted
                </>
              ) : (
                <>
                  <CircleDashed className="h-3 w-3" />
                  Waiting
                </>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
