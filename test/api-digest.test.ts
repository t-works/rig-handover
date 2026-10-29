import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

// Route tests use a temp runs dir; runs/ is read-only (plan.md §2d).
const runsDir = mkdtempSync(join(tmpdir(), 'rig-api-digest-'));
const config = {
  adapter: 'shim',
  installed: '2026-10-29T14:06:00+01:00',
  beatEverySeconds: 60,
  runsDir,
};
const app = createApp(config);

afterAll(() => {
  rmSync(runsDir, { recursive: true, force: true });
});

describe('GET /api/digest/:night', () => {
  it('returns the rows as JSON, sorted by job, with badLines counted', async () => {
    writeFileSync(
      join(runsDir, '2026-10-28.jsonl'),
      [
        '{"at":"2026-10-29T01:30:00+01:00","job":"fixtures/refresh","status":"retry","owner":"rook","error":"upstream 503"}',
        '{"at":"2026-10-29T01:31:00+01:00","job":"digest/render","status":"ok","owner":null}',
        'not json at all',
        '',
      ].join('\n'),
    );
    const res = await app.request('/api/digest/2026-10-28');
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('application/json');
    const body = await res.json();
    expect(body.badLines).toBe(1);
    expect(body.rows.map((r: { job: string }) => r.job)).toEqual(['digest/render', 'fixtures/refresh']);
    expect(body.rows[0]).toEqual({
      job: 'digest/render',
      owner: null,
      runs: 1,
      retries: 0,
      lastStatus: 'ok',
      lastError: null,
      firstTime: '2026-10-29T01:31:00+01:00',
      lastTime: '2026-10-29T01:31:00+01:00',
    });
  });

  it('returns 404 for a night with no file', async () => {
    const res = await app.request('/api/digest/2099-01-01');
    expect(res.status).toBe(404);
  });

  it('returns an empty night as rows: [] with badLines: 0', async () => {
    writeFileSync(join(runsDir, '2026-10-27.jsonl'), '');
    const res = await app.request('/api/digest/2026-10-27');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ rows: [], badLines: 0 });
  });
});
