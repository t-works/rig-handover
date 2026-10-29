import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DigestRow, JobStatus, NightDigest, ReadNight } from './types.js';

const STATUSES: JobStatus[] = ['ok', 'retry', 'fail'];

export const readNight: ReadNight = (runsDir, night) => {
  let content: string;
  try {
    content = readFileSync(join(runsDir, `${night}.jsonl`), 'utf8');
  } catch {
    return null;
  }
  const byJob = new Map<string, DigestRow>();
  let badLines = 0;
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      badLines += 1;
      continue;
    }
    if (typeof parsed !== 'object' || parsed === null) {
      badLines += 1;
      continue;
    }
    const rec = parsed as Record<string, unknown>;
    const job = typeof rec.job === 'string' ? rec.job : null;
    const at = typeof rec.at === 'string' ? rec.at : null;
    const status = STATUSES.find((s) => s === rec.status) ?? null;
    if (job === null || at === null || status === null) {
      badLines += 1;
      continue;
    }
    const owner = typeof rec.owner === 'string' ? rec.owner : null;
    const error = typeof rec.error === 'string' ? rec.error : null;
    // The night's log is written sequentially, so file order is time order: the first line of a
    // job is its first time, the last line its last time, status and owner.
    const row = byJob.get(job) ?? {
      job,
      owner,
      runs: 0,
      retries: 0,
      lastStatus: status,
      lastError: null,
      firstTime: at,
      lastTime: at,
    };
    row.runs += 1;
    if (status === 'retry') row.retries += 1;
    if (error !== null) row.lastError = error;
    row.lastStatus = status;
    row.lastTime = at;
    row.owner = owner;
    byJob.set(job, row);
  }
  const rows = [...byJob.values()].sort((a, b) => (a.job < b.job ? -1 : a.job > b.job ? 1 : 0));
  return { rows, badLines };
};
