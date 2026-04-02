import { cronJobs } from "convex/server";

import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "mark stale participants offline",
  { seconds: 60 },
  internal.participants.markStaleOffline,
);

export default crons;
