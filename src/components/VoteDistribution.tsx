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
    <div className="flex flex-col gap-3 py-4 w-full">
      <h3 className="text-sm font-medium">Vote Distribution</h3>
      <div className="flex flex-col gap-2">
        {sortedValues.map((value) => {
          const count = voteCounts[value];
          const percentage = (count / maxVotes) * 100;
          const voters = votes
            .filter((v) => v.value === value)
            .map((v) => v.displayName)
            .join(", ");

          return (
            <div key={value} className="flex items-center gap-3">
              <div className="w-12 text-right font-medium">{value}</div>
              <div className="flex-1 max-w-[200px]">
                <div
                  className="h-4 bg-primary rounded-sm transition-all duration-500"
                  style={{ width: `${percentage}%` }}
                  title={voters}
                />
              </div>
              <div className="w-20 text-sm text-muted-foreground">
                {count} {count === 1 ? "vote" : "votes"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
