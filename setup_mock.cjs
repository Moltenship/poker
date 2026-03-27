const fs = require('fs');
let content = fs.readFileSync('src/pages/__tests__/Room.test.tsx', 'utf8');

const mockStr = `
vi.mock("../../convex/_generated/api", () => ({
  api: {
    rooms: { getRoom: "rooms.getRoom" },
    tasks: { getTasksForRoom: "tasks.getTasksForRoom", getCurrentTask: "tasks.getCurrentTask" },
    participants: { getParticipants: "participants.getParticipants" },
    voting: { getVoteStatus: "voting.getVoteStatus" },
    jira: { getImportStatus: "jira.getImportStatus" },
  }
}));
`;

content = content.replace('vi.mock("convex/react", () => ({', mockStr + '\nvi.mock("convex/react", () => ({');

// Replace all mockImplementation to use argsArray[0]
content = content.replace(/let taskQueryCount = 0;\n\s*vi\.mocked\(useQuery\)\.mockImplementation\(\(\.\.\.argsArray: any\[\]\) => \{[\s\S]*?\n\s*\}\);/g, `vi.mocked(useQuery).mockImplementation((...argsArray: any[]) => {
        const query = argsArray[0] as string;
        const args = argsArray[1];
        if (args === "skip") return undefined;
        if (query === "rooms.getRoom") return mockRoom;
        if (query === "tasks.getTasksForRoom") return mockTasks;
        if (query === "participants.getParticipants") return mockParticipants;
        if (query === "voting.getVoteStatus") return [];
        return undefined;
      });`);

// Update the other test mocks too
content = content.replace(/if \('roomCode' in args\) return null;/g, `if (query === "rooms.getRoom") return null;`);
content = content.replace(/const args = argsArray\[1\];/g, `const query = argsArray[0] as string;\n      const args = argsArray[1];`);

fs.writeFileSync('src/pages/__tests__/Room.test.tsx', content);
