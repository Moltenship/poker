import fs from 'fs';

const content = fs.readFileSync('src/pages/Room.tsx', 'utf8');

const updated = content.replace(
  /const participants = useQuery\(\n\s+\(api as any\)\.participants\.getParticipants,\n\s+room\?._id \? \{ roomId: room\._id \} : "skip"\n\s+\);/,
  `const participants = useQuery(
    (api as any).participants.getParticipants,
    room?._id ? { roomId: room._id } : "skip"
  );

  const currentTask = tasks && room ? tasks[room.currentTaskIndex] : null;
  const voteStatus = useQuery(
    (api as any).voting.getVoteStatus,
    currentTask?._id ? { taskId: currentTask._id } : "skip"
  );
  
  const votedIds = voteStatus?.filter((v: any) => v.hasVoted).map((v: any) => v.participantId) || [];
  const showVoteStatus = room?.status === "voting";`
).replace(
  /<ParticipantList participants=\{participants \|\| \[\]\} \/>/,
  `<ParticipantList participants={participants || []} votedIds={votedIds} showVoteStatus={showVoteStatus} />`
);

fs.writeFileSync('src/pages/Room.tsx', updated);
