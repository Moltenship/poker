export interface VoteDistributionProps {
  votes: Array<{ value: string; displayName: string }>;
  cardSet: string[];
}

export function VoteDistribution({ votes, cardSet }: VoteDistributionProps) {
  if (votes.length === 0) return null;

  const voteCounts = votes.reduce((acc, vote) => {
    acc[vote.value] = (acc[vote.value] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const maxVotes = Math.max(...Object.values(voteCounts), 1);

  const sortedValues = Object.keys(voteCounts).sort((a, b) => {
    const aIndex = cardSet.indexOf(a);
    const bIndex = cardSet.indexOf(b);
    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    return a.localeCompare(b);
  });

  return (
    <div className="space-y-1.5">
      <h3 className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Distribution</h3>
      <div className="space-y-1">
        {sortedValues.map((value) => {
          const count = voteCounts[value];
          const percentage = (count / maxVotes) * 100;
          const voters = votes.filter((v) => v.value === value).map((v) => v.displayName).join(", ");

          return (
            <div key={value} className="flex items-center gap-2">
              <span className="w-6 text-right text-[13px] font-medium text-foreground/70">{value}</span>
              <div className="flex-1">
                <div
                  className="h-2.5 bg-primary/60 rounded-sm transition-all duration-500"
                  style={{ width: `${percentage}%`, minWidth: percentage > 0 ? '3px' : '0' }}
                  title={voters}
                />
              </div>
              <span className="text-[11px] text-muted-foreground w-4">{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
