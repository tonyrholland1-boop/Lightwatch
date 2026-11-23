import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/**
 * Boots the real server against a throwaway SQLite file and exercises the public
 * API over HTTP, so validation, rate limits and the "server owns the timestamp"
 * rule are tested end to end rather than mocked.
 */

const PORT = 5199;
const BASE = `http://127.0.0.1:${PORT}`;
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lightwatch-test-'));

let server;
const clientId = `suite-${Date.now()}`;

test.before(async () => {
  server = spawn(process.execPath, ['server/index.js'], {
    cwd: path.resolve(import.meta.dirname, '..'),
    env: {
      ...process.env,
      PORT: String(PORT),
      DATA_DIR: tmpDir,
      NODE_ENV: 'test',
      FINGERPRINT_SALT: 'test-salt',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('server did not start')), 15000);
    server.stdout.on('data', (chunk) => {
      if (chunk.toString().includes('listening')) {
        clearTimeout(timer);
        resolve();
      }
    });
    server.stderr.on('data', (chunk) => {
      const text = chunk.toString();
      if (text.includes('Error')) reject(new Error(text));
    });
    server.on('exit', () => reject(new Error('server exited early')));
  });
});

test.after(async () => {
  server?.kill('SIGTERM');
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

const get = async (pathname, headers = {}) => {
  const res = await fetch(BASE + pathname, { headers });
  return { status: res.status, body: await res.json() };
};

const post = async (body, headers = {}) => {
  const res = await fetch(BASE + '/api/reports', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
};

test('health check responds', async () => {
  const { status, body } = await get('/api/health');
  assert.equal(status, 200);
  assert.equal(body.ok, true);
});

test('overview lists active neighbourhoods with derived status', async () => {
  const { status, body } = await get('/api/overview');
  assert.equal(status, 200);
  assert.ok(body.neighbourhoods.length >= 5, 'pilot needs at least five areas');
  for (const area of body.neighbourhoods) {
    assert.ok(['ON', 'OFF', 'UNKNOWN', 'CONFLICTED'].includes(area.status));
    assert.ok(typeof area.statusExplanation === 'string' && area.statusExplanation.length > 0);
    // A status must never be asserted without a timestamp.
    if (area.status !== 'UNKNOWN') assert.ok(area.latestReportAt, `${area.name} has no timestamp`);
  }
});

test('never returns ON or OFF as a default for unreported areas', async () => {
  const { body } = await get('/api/overview');
  for (const area of body.neighbourhoods) {
    if (area.eligibleReportCount === 0) {
      assert.equal(area.status, 'UNKNOWN', `${area.name} should be UNKNOWN`);
    }
  }
});

test('search is case-insensitive and scoped to supported areas', async () => {
  const upper = await get('/api/neighbourhoods?q=LEKKI');
  const lower = await get('/api/neighbourhoods?q=lekki');
  assert.equal(upper.body.neighbourhoods.length, lower.body.neighbourhoods.length);
  assert.ok(upper.body.neighbourhoods.length >= 1);

  const missing = await get('/api/neighbourhoods?q=atlantis');
  assert.equal(missing.body.neighbourhoods.length, 0, 'unsupported areas must not be suggested');
});

test('search results carry a derived status, not a bare area record', async () => {
  const { body } = await get('/api/neighbourhoods?q=a');
  assert.ok(body.neighbourhoods.length > 0);
  for (const area of body.neighbourhoods) {
    assert.ok(
      ['ON', 'OFF', 'UNKNOWN', 'CONFLICTED'].includes(area.status),
      `${area.name} is missing a derived status`,
    );
    assert.ok(typeof area.statusExplanation === 'string' && area.statusExplanation.length > 0);
    assert.ok(area.eligibleReportCount >= 0);
  }
});

test('unknown neighbourhood returns a friendly 404', async () => {
  const { status, body } = await get('/api/neighbourhoods/not-a-real-place');
  assert.equal(status, 404);
  assert.ok(body.message.length > 0);
  assert.ok(!/stack|sqlite|error:/i.test(body.message), 'must not leak internals');
});

test('a valid report is accepted and reflected in the status', async () => {
  const areas = (await get('/api/overview')).body.neighbourhoods;
  const area = areas.find((item) => item.eligibleReportCount === 0) ?? areas[0];

  const { status, body } = await post(
    { neighbourhoodId: area.id, status: 'ON', observationAcknowledged: true },
    { 'User-Agent': `${clientId}-valid` },
  );

  assert.equal(status, 201);
  assert.equal(body.success, true);
  assert.equal(body.report.status, 'ON');
  assert.equal(body.report.sourceType, 'COMMUNITY');
  assert.equal(body.report.verificationState, 'UNVERIFIED');
  assert.equal(body.neighbourhood.status, 'ON');
});

test('the client cannot dictate the timestamp, source or verification state', async () => {
  const areas = (await get('/api/overview')).body.neighbourhoods;
  const area = areas[areas.length - 1];

  const before = Date.now();
  const { status, body } = await post(
    {
      neighbourhoodId: area.id,
      status: 'OFF',
      observationAcknowledged: true,
      createdAt: '1999-01-01T00:00:00.000Z',
      sourceType: 'OFFICIAL',
      verificationState: 'VERIFIED',
      isHidden: true,
    },
    { 'User-Agent': `${clientId}-authority` },
  );

  assert.equal(status, 201);
  const stored = Date.parse(body.report.createdAt);
  assert.ok(Math.abs(stored - before) < 10000, 'timestamp must be server-generated');
  assert.equal(body.report.sourceType, 'COMMUNITY');
  assert.equal(body.report.verificationState, 'UNVERIFIED');
});

test('missing observation acknowledgement is rejected', async () => {
  const area = (await get('/api/overview')).body.neighbourhoods[0];
  const { status, body } = await post(
    { neighbourhoodId: area.id, status: 'ON' },
    { 'User-Agent': `${clientId}-noack` },
  );
  assert.equal(status, 400);
  assert.equal(body.error, 'acknowledgement_required');
});

test('invalid status values are rejected', async () => {
  const area = (await get('/api/overview')).body.neighbourhoods[0];
  for (const bad of ['MAYBE', 'on ', 42, null, '']) {
    const { status, body } = await post(
      { neighbourhoodId: area.id, status: bad, observationAcknowledged: true },
      { 'User-Agent': `${clientId}-bad-${String(bad)}` },
    );
    assert.equal(status, 400, `status ${JSON.stringify(bad)} should be rejected`);
    assert.equal(body.error, 'invalid_status');
  }
});

test('unsupported neighbourhood is rejected', async () => {
  const { status, body } = await post(
    { neighbourhoodId: '00000000-0000-0000-0000-000000000000', status: 'ON', observationAcknowledged: true },
    { 'User-Agent': `${clientId}-nosucharea` },
  );
  assert.equal(status, 404);
  assert.equal(body.error, 'unsupported_neighbourhood');
});

test('a repeated submission inside the cooldown is rejected as duplicate', async () => {
  const area = (await get('/api/overview')).body.neighbourhoods[1];
  const headers = { 'User-Agent': `${clientId}-dup` };

  const first = await post(
    { neighbourhoodId: area.id, status: 'OFF', observationAcknowledged: true },
    headers,
  );
  assert.equal(first.status, 201);

  const second = await post(
    { neighbourhoodId: area.id, status: 'OFF', observationAcknowledged: true },
    headers,
  );
  assert.equal(second.status, 409);
  assert.equal(second.body.error, 'duplicate');
});

test('different clients can corroborate the same area', async () => {
  const area = (await get('/api/overview')).body.neighbourhoods[2];

  await post(
    { neighbourhoodId: area.id, status: 'ON', observationAcknowledged: true },
    { 'User-Agent': `${clientId}-corrob-a` },
  );
  const second = await post(
    { neighbourhoodId: area.id, status: 'ON', observationAcknowledged: true },
    { 'User-Agent': `${clientId}-corrob-b` },
  );

  assert.equal(second.status, 201);
  assert.equal(second.body.neighbourhood.status, 'ON');
  assert.equal(second.body.neighbourhood.confidence, 'AGREED');
  assert.ok(second.body.neighbourhood.supportingCount >= 2);
});

test('conflicting corroboration produces CONFLICTED, not a coin flip', async () => {
  const area = (await get('/api/overview')).body.neighbourhoods[3];

  await post(
    { neighbourhoodId: area.id, status: 'ON', observationAcknowledged: true },
    { 'User-Agent': `${clientId}-conf-a` },
  );
  await post(
    { neighbourhoodId: area.id, status: 'OFF', observationAcknowledged: true },
    { 'User-Agent': `${clientId}-conf-b` },
  );
  const clash = await post(
    { neighbourhoodId: area.id, status: 'OFF', observationAcknowledged: true },
    { 'User-Agent': `${clientId}-conf-c` },
  );

  assert.equal(clash.status, 201);
  assert.ok(
    ['CONFLICTED', 'OFF'].includes(clash.body.neighbourhood.status),
    'conflicting reports must never resolve to an unsupported certainty',
  );
  if (clash.body.neighbourhood.status === 'CONFLICTED') {
    assert.ok(clash.body.neighbourhood.supportingCount >= 1);
    assert.ok(clash.body.neighbourhood.opposingCount >= 1);
  }
});

test('malformed JSON is rejected without leaking internals', async () => {
  const { status, body } = await post('{ not json', { 'User-Agent': `${clientId}-badjson` });
  assert.equal(status, 400);
  assert.equal(body.error, 'invalid_request');
});

test('oversized bodies are rejected', async () => {
  const { status } = await post({ blob: 'a'.repeat(50000) }, { 'User-Agent': `${clientId}-huge` });
  assert.ok(status >= 400, 'body limit must apply');
});

test('unknown API routes return JSON, not an HTML error page', async () => {
  const { status, body } = await get('/api/definitely-not-a-route');
  assert.equal(status, 404);
  assert.equal(body.error, 'not_found');
});

test('response carries no server fingerprint', async () => {
  const res = await fetch(BASE + '/api/health');
  assert.equal(res.headers.get('x-powered-by'), null);
});
