import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

// Route tests use a temp runs dir; runs/ is read-only (plan.md §2d).
const runsDir = mkdtempSync(join(tmpdir(), 'rig-digest-page-'));
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

describe('GET /digest/:night', () => {
  it('renders the rows as a table, sorted by job, with retries >= 3 and fail marked', async () => {
    writeFileSync(
      join(runsDir, '2026-10-28.jsonl'),
      [
        '{"at":"2026-10-29T01:00:00+01:00","job":"worker/build","status":"retry","owner":"rook","error":"compile error"}',
        '{"at":"2026-10-29T01:01:00+01:00","job":"worker/build","status":"retry","owner":"rook","error":"compile error"}',
        '{"at":"2026-10-29T01:02:00+01:00","job":"worker/build","status":"retry","owner":"rook","error":"compile error"}',
        '{"at":"2026-10-29T01:03:00+01:00","job":"worker/build","status":"ok","owner":"rook"}',
        '{"at":"2026-10-29T01:04:00+01:00","job":"notes/backup","status":"fail","owner":"rook","error":"disk full"}',
        '{"at":"2026-10-29T01:05:00+01:00","job":"digest/render","status":"ok","owner":null}',
      ].join('\n'),
    );
    const res = await app.request('/digest/2026-10-28');
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('<h1>digest · 2026-10-28</h1>');
    // Rows sorted by job.
    expect(html).toContain('<td>digest/render</td>');
    expect(html).toContain('<td>notes/backup</td>');
    expect(html).toContain('<td>worker/build</td>');
    // worker/build ended with 3 retries; the retries cell is marked.
    expect(html).toContain('<td class="warn">3</td>');
    // notes/backup failed; the last status cell is marked.
    expect(html).toContain('<td class="warn">fail</td>');
    // digest/render has owner null; it renders as —, never dropped.
    expect(html).toContain('<td><span class="mute">—</span></td>');
  });

  it('returns 404 for a night with no file', async () => {
    const res = await app.request('/digest/2099-01-01');
    expect(res.status).toBe(404);
  });

  it('renders "nothing ran" for an empty night', async () => {
    writeFileSync(join(runsDir, '2026-10-27.jsonl'), '');
    const res = await app.request('/digest/2026-10-27');
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('nothing ran');
  });

  it('renders the good rows and counts a bad line', async () => {
    writeFileSync(
      join(runsDir, '2026-10-26.jsonl'),
      [
        '{"at":"2026-10-29T01:00:00+01:00","job":"good/job","status":"ok","owner":"rook"}',
        'this line is not json',
      ].join('\n'),
    );
    const res = await app.request('/digest/2026-10-26');
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('<td>good/job</td>');
    expect(html).toContain('1 bad line not shown');
  });
});
