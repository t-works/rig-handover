import type { DigestRow, NightDigest } from '../digest/types.js';

export function DigestPage({ night, digest }: { night: string; digest: NightDigest }) {
  return (
    <>
      <h1>digest · {night}</h1>
      {digest.rows.length === 0 ? (
        <p class="mute">nothing ran</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>job</th>
              <th>owner</th>
              <th>runs</th>
              <th>retries</th>
              <th>last status</th>
              <th>last error</th>
              <th>first time</th>
              <th>last time</th>
            </tr>
          </thead>
          <tbody>
            {digest.rows.map((row) => (
              <DigestRowView row={row} key={row.job} />
            ))}
          </tbody>
        </table>
      )}
      {digest.badLines > 0 ? (
        <p class="mute">
          {digest.badLines} bad line{digest.badLines === 1 ? '' : 's'} not shown
        </p>
      ) : null}
    </>
  );
}

function DigestRowView({ row }: { row: DigestRow }) {
  // A night is worth waking up for only if something failed or retried three times or more.
  const marked = row.lastStatus === 'fail' || row.retries >= 3;
  return (
    <tr>
      <td>{row.job}</td>
      <td>{row.owner ?? <span class="mute">—</span>}</td>
      <td>{row.runs}</td>
      <td class={marked ? 'warn' : undefined}>{row.retries}</td>
      <td class={row.lastStatus === 'fail' ? 'warn' : undefined}>{row.lastStatus}</td>
      <td>{row.lastError ?? <span class="mute">—</span>}</td>
      <td>{row.firstTime}</td>
      <td>{row.lastTime}</td>
    </tr>
  );
}
