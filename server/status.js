/**
 * Server-authoritative status derivation.
 *
 * Rules (mirrors the PRD, section 7.4):
 *  1. Only reports from the last `agingMinutes` (default 120) count. Hidden reports never count.
 *  2. If nothing counts: UNKNOWN. If older reports exist, freshness is STALE.
 *  3. Look at reports from the last `agreementWindowMinutes` (default 30).
 *  4. Two or more matching recent reports, with that side ahead of the opposite side,
 *     confirm the status. Two matching reports outweigh a single older dissent.
 *  5. Conflicting recent reports without a clear, agreed majority: CONFLICTED.
 *  6. A single recent report is shown with a SINGLE confidence caveat — unless an
 *     older eligible report says the opposite, in which case: CONFLICTED.
 *  7. No recent reports: the older eligible reports decide, with AGING freshness.
 *     Agreement between them is required; disagreement is CONFLICTED.
 */

const toMs = (iso) => new Date(iso).getTime();

export function deriveStatus(reports, thresholds, nowMs = Date.now()) {
  const {
    freshMinutes,
    agingMinutes,
    agreementWindowMinutes,
    agreementMin,
  } = thresholds;

  const clean = [...reports]
    .filter((report) => !report.isHidden)
    .map((report) => ({ ...report, createdAtMs: toMs(report.createdAt) }))
    .filter((report) => Number.isFinite(report.createdAtMs))
    .sort((a, b) => b.createdAtMs - a.createdAtMs);

  const ageMinutes = (report) => Math.max(0, (nowMs - report.createdAtMs) / 60000);
  const latest = clean[0];
  const eligible = clean.filter((report) => ageMinutes(report) <= agingMinutes);
  const staleReportCount = clean.length - eligible.length;

  const count = (list, status) => list.filter((report) => report.status === status).length;

  if (eligible.length === 0) {
    const staleOnly = Boolean(latest);
    return {
      status: 'UNKNOWN',
      freshness: staleOnly ? 'STALE' : null,
      confidence: 'NONE',
      latestReportAt: latest ? latest.createdAt : null,
      eligibleReportCount: 0,
      staleReportCount,
      supportingCount: 0,
      opposingCount: 0,
      staleOnly,
      explanation: staleOnly
        ? `The latest report is more than ${agingMinutes} minutes old, so the current status cannot be confirmed.`
        : 'No community reports in the last two hours.',
    };
  }

  const newest = eligible[0];
  const newestAge = ageMinutes(newest);
  const freshness = newestAge <= freshMinutes ? 'FRESH' : 'AGING';

  const recent = eligible.filter((report) => ageMinutes(report) <= agreementWindowMinutes);
  const older = eligible.filter((report) => ageMinutes(report) > agreementWindowMinutes);

  const onRecent = count(recent, 'ON');
  const offRecent = count(recent, 'OFF');
  const onOlder = count(older, 'ON');
  const offOlder = count(older, 'OFF');

  const base = {
    latestReportAt: newest.createdAt,
    eligibleReportCount: eligible.length,
    staleReportCount,
    staleOnly: false,
    freshness,
  };

  const agreed = (status, supporting, opposing, explanation, confidence = 'AGREED') => ({
    ...base,
    status,
    confidence,
    supportingCount: supporting,
    opposingCount: opposing,
    explanation,
  });

  const conflicted = (supporting, opposing, explanation) => ({
    ...base,
    status: 'CONFLICTED',
    confidence: 'CONFLICTED',
    supportingCount: supporting,
    opposingCount: opposing,
    explanation,
  });

  if (recent.length === 0) {
    if (onOlder > 0 && offOlder > 0) {
      return conflicted(
        onOlder,
        offOlder,
        'Reports from the past two hours disagree, and none are recent enough to confirm a status.',
      );
    }
    const status = onOlder > 0 ? 'ON' : 'OFF';
    const supporting = status === 'ON' ? onOlder : offOlder;
    if (supporting >= agreementMin) {
      return agreed(
        status,
        supporting,
        0,
        `Based on ${supporting} community reports from the past two hours.`,
      );
    }
    return agreed(
      status,
      supporting,
      0,
      'Based on a single community report from the past two hours.',
      'SINGLE',
    );
  }

  const recentWindowLabel = `the last ${agreementWindowMinutes} minutes`;

  if (onRecent > 0 && offRecent > 0) {
    if (onRecent >= agreementMin && onRecent > offRecent) {
      return agreed(
        'ON',
        onRecent,
        offRecent,
        `Supported by ${onRecent} matching community reports in ${recentWindowLabel}.`,
      );
    }
    if (offRecent >= agreementMin && offRecent > onRecent) {
      return agreed(
        'OFF',
        offRecent,
        onRecent,
        `Supported by ${offRecent} matching community reports in ${recentWindowLabel}.`,
      );
    }
    return conflicted(
      Math.max(onRecent, offRecent),
      Math.min(onRecent, offRecent),
      'Recent community reports disagree, so a single status cannot be confirmed.',
    );
  }

  const recentStatus = onRecent > 0 ? 'ON' : 'OFF';
  const recentCount = recentStatus === 'ON' ? onRecent : offRecent;
  const olderOpposing = recentStatus === 'ON' ? offOlder : onOlder;

  if (recentCount >= agreementMin) {
    return agreed(
      recentStatus,
      recentCount,
      olderOpposing,
      `Supported by ${recentCount} matching community reports in ${recentWindowLabel}.`,
    );
  }

  if (olderOpposing > 0) {
    return conflicted(
      recentCount,
      olderOpposing,
      'A recent report conflicts with an earlier one, so the status cannot be confirmed.',
    );
  }

  return agreed(
    recentStatus,
    recentCount,
    0,
    'Based on a single recent community report.',
    'SINGLE',
  );
}

export function freshnessForReport(createdAtIso, thresholds, nowMs = Date.now()) {
  const ageMinutes = Math.max(0, (nowMs - toMs(createdAtIso)) / 60000);
  if (ageMinutes <= thresholds.freshMinutes) return 'FRESH';
  if (ageMinutes <= thresholds.agingMinutes) return 'AGING';
  return 'STALE';
}
