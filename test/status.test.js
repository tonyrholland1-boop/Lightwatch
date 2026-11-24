import test from 'node:test';
import assert from 'node:assert/strict';
import { deriveStatus, freshnessForReport } from '../server/status.js';

const THRESHOLDS = {
  freshMinutes: 30,
  agingMinutes: 120,
  agreementWindowMinutes: 30,
  agreementMin: 2,
};

const NOW = Date.parse('2026-11-23T09:00:00Z');
const at = (minutesAgo) => new Date(NOW - minutesAgo * 60000).toISOString();
const report = (status, minutesAgo, extra = {}) => ({
  status,
  createdAt: at(minutesAgo),
  isHidden: false,
  ...extra,
});

const derive = (reports) => deriveStatus(reports, THRESHOLDS, NOW);

test('no reports at all is UNKNOWN, never OFF', () => {
  const result = derive([]);
  assert.equal(result.status, 'UNKNOWN');
  assert.equal(result.freshness, null);
  assert.equal(result.staleOnly, false);
  assert.equal(result.eligibleReportCount, 0);
});

test('only stale reports is UNKNOWN with STALE freshness', () => {
  const result = derive([report('OFF', 200), report('OFF', 240)]);
  assert.equal(result.status, 'UNKNOWN');
  assert.equal(result.freshness, 'STALE');
  assert.equal(result.staleOnly, true);
  assert.equal(result.eligibleReportCount, 0);
  assert.equal(result.staleReportCount, 2);
});

test('a single fresh report is shown but labelled SINGLE', () => {
  const result = derive([report('ON', 5)]);
  assert.equal(result.status, 'ON');
  assert.equal(result.confidence, 'SINGLE');
  assert.equal(result.freshness, 'FRESH');
  assert.equal(result.supportingCount, 1);
});

test('two matching recent reports confirm the status', () => {
  const result = derive([report('ON', 4), report('ON', 12)]);
  assert.equal(result.status, 'ON');
  assert.equal(result.confidence, 'AGREED');
  assert.equal(result.supportingCount, 2);
});

test('two matching reports outweigh a single older dissent', () => {
  const result = derive([report('ON', 3), report('ON', 9), report('OFF', 22)]);
  assert.equal(result.status, 'ON');
  assert.equal(result.supportingCount, 2);
  assert.equal(result.opposingCount, 1);
});

test('a two-versus-two tie is CONFLICTED', () => {
  const result = derive([
    report('OFF', 5),
    report('OFF', 10),
    report('ON', 15),
    report('ON', 20),
  ]);
  assert.equal(result.status, 'CONFLICTED');
  assert.equal(result.confidence, 'CONFLICTED');
});

test('one against one is CONFLICTED', () => {
  const result = derive([report('OFF', 5), report('ON', 15)]);
  assert.equal(result.status, 'CONFLICTED');
});

test('a recent report conflicting with an older one is CONFLICTED', () => {
  const result = derive([report('ON', 5), report('OFF', 90)]);
  assert.equal(result.status, 'CONFLICTED');
});

test('hidden reports never affect the status', () => {
  const result = derive([
    report('ON', 3),
    report('ON', 8, { isHidden: true }),
    report('OFF', 10, { isHidden: true }),
  ]);
  assert.equal(result.status, 'ON');
  assert.equal(result.confidence, 'SINGLE');
  assert.equal(result.eligibleReportCount, 1);
});

test('reports between 30 and 120 minutes old still count, as AGING', () => {
  const result = derive([report('OFF', 45), report('OFF', 90)]);
  assert.equal(result.status, 'OFF');
  assert.equal(result.freshness, 'AGING');
  assert.equal(result.confidence, 'AGREED');
});

test('the newest report determines freshness', () => {
  assert.equal(derive([report('ON', 10), report('ON', 80)]).freshness, 'FRESH');
  assert.equal(derive([report('ON', 40), report('ON', 80)]).freshness, 'AGING');
});

test('agreement inside the window ignores older reports of the winning side', () => {
  const result = derive([
    report('OFF', 2),
    report('OFF', 6),
    report('ON', 70),
  ]);
  assert.equal(result.status, 'OFF');
  assert.equal(result.supportingCount, 2);
});

test('report freshness thresholds match the PRD bands', () => {
  assert.equal(freshnessForReport(at(0), THRESHOLDS, NOW), 'FRESH');
  assert.equal(freshnessForReport(at(30), THRESHOLDS, NOW), 'FRESH');
  assert.equal(freshnessForReport(at(31), THRESHOLDS, NOW), 'AGING');
  assert.equal(freshnessForReport(at(120), THRESHOLDS, NOW), 'AGING');
  assert.equal(freshnessForReport(at(121), THRESHOLDS, NOW), 'STALE');
});

test('freshness thresholds are configurable', () => {
  const tight = { ...THRESHOLDS, freshMinutes: 5, agingMinutes: 10 };
  assert.equal(freshnessForReport(at(6), tight, NOW), 'AGING');
  assert.equal(freshnessForReport(at(11), tight, NOW), 'STALE');
});

test('every derived state carries a human explanation', () => {
  const samples = [
    [],
    [report('ON', 5)],
    [report('ON', 4), report('ON', 9)],
    [report('ON', 5), report('OFF', 9)],
    [report('ON', 200)],
  ];
  for (const sample of samples) {
    const result = derive(sample);
    assert.ok(result.explanation.length > 10, 'explanation should be present');
    assert.ok(
      ['ON', 'OFF', 'UNKNOWN', 'CONFLICTED'].includes(result.status),
      'status must be one of the four declared states',
    );
  }
});
