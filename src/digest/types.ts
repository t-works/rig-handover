export type JobStatus = 'ok' | 'retry' | 'fail';

export type DigestRow = {
  job: string;
  owner: string | null;
  runs: number;
  retries: number;
  lastStatus: JobStatus;
  lastError: string | null;
  firstTime: string;
  lastTime: string;
};

export type NightDigest = {
  rows: DigestRow[];
  badLines: number;
};

// Signature only; the reader implements it. A missing night file yields null so the route can
// answer 404; bad lines are counted in `badLines`, never thrown (plan.md §1).
export type ReadNight = (runsDir: string, night: string) => NightDigest | null;
