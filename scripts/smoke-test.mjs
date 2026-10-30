const apiUrl = (process.env.API_URL || 'http://127.0.0.1:5000/api').replace(/\/$/, '');
import { readFile } from 'node:fs/promises';

async function check(url, label, verify) {
  let response;
  try { response = await fetch(url, { signal: AbortSignal.timeout(8000) }); } catch { throw new Error(`${label} could not be reached at ${url}.`); }
  if (!response.ok) throw new Error(`${label} returned HTTP ${response.status}.`);
  await verify(response);
  console.log(`Passed: ${label}`);
}

await check(`${apiUrl}/health`, 'API health check', async response => {
  const body = await response.json();
  if (body.status !== 'ok') throw new Error('API health check did not return status ok.');
});
const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
if (!html.includes('id="root"') || !html.includes('/assets/')) throw new Error('Built website artifact is not a valid React entry page.');
console.log('Passed: built website artifact check');
console.log('Profit Pulse smoke test passed.');
