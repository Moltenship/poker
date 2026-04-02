export interface VoteDistributionProps {
  votes: { value: string; displayName: string }[];
  cardSet: string[];
}

export function VoteDistribution({ votes, cardSet }: VoteDistributionProps) {
  if (votes.length === 0) {
    return null;
  }

  const voteCounts = votes.reduce(
    (acc, vote) => {
      acc[vote.value] = (acc[vote.value] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const maxVotes = Math.max(...Object.values(voteCounts), 1);

  const sortedValues = Object.keys(voteCounts).sort((a, b) => {
    const aIndex = cardSet.indexOf(a);
    const bIndex = cardSet.indexOf(b);
    if (aIndex !== -1 && bIndex !== -1) {
      return aIndex - bIndex;
    }
    if (aIndex !== -1) {
      return -1;
    }
    if (bIndex !== -1) {
      return 1;
    }
    return a.localeCompare(b);
  });

  return (
    <div className="space-y-1.5">
      <h3 className="text-muted-foreground text-[11px] font-medium tracking-wider uppercase">
        Distribution
      </h3>
      <div className="space-y-1">
        {sortedValues.map((value) => {
          const count = voteCounts[value];
          const percentage = (count / maxVotes) * 100;
          const voters = votes
            .filter((v) => v.value === value)
            .map((v) => v.displayName)
            .join(", ");

          return (
            <div key={value} className="flex items-center gap-2">
              <span className="text-foreground/70 w-6 text-right text-[13px] font-medium">
                {value}
              </span>
              <div className="flex-1">
                <div
                  className="bg-primary/60 h-2.5 rounded-sm transition-all duration-500"
                  style={{ minWidth: percentage > 0 ? "3px" : "0", width: `${percentage}%` }}
                  title={voters}
                />
              </div>
              <span className="text-muted-foreground w-4 text-[11px]">{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
