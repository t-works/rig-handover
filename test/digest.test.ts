import { describe, expect, it } from 'vitest';
import { readNight } from '../src/digest/reader.js';

describe('digest reader', () => {
  it('reads runs/2026-10-28.jsonl into 5 rows with 1 bad line', () => {
    const night = readNight('runs', '2026-10-28');
    expect(night?.badLines).toBe(1);
    expect(night?.rows.length).toBe(5);
    expect(night?.rows.map((r) => r.job)).toEqual([
      'digest/render',
      'fixtures/refresh',
      'lane/sync',
      'notes/backup',
      'rig/rotate-logs',
    ]);
  });

  it('aggregates a job with retries and keeps the last error', () => {
    const night = readNight('runs', '2026-10-28');
    const refresh = night?.rows.find((r) => r.job === 'fixtures/refresh');
    expect(refresh).toEqual({
      job: 'fixtures/refresh',
      owner: 'rook',
      runs: 4,
      retries: 3,
      lastStatus: 'ok',
      lastError: 'upstream 503',
      firstTime: '2026-10-29T01:30:00+01:00',
      lastTime: '2026-10-29T01:37:00+01:00',
    });
  });

  it('keeps a row with a null owner', () => {
    const night = readNight('runs', '2026-10-28');
    const render = night?.rows.find((r) => r.job === 'digest/render');
    expect(render?.owner).toBeNull();
    expect(render?.lastStatus).toBe('ok');
  });
});
