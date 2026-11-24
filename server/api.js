import express from 'express';
import crypto from 'node:crypto';
import { config } from './config.js';
import { store } from './db.js';
import { deriveStatus } from './status.js';

export const api = express.Router();

const clientFingerprint = (req) => {
  const address =
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress || 'unknown';
  const agent = req.headers['user-agent'] || 'unknown';
  return crypto
    .createHmac('sha256', config.fingerprintSalt)
    .update(`${address}::${agent}`)
    .digest('hex')
    .slice(0, 32);
};

const areaPayload = (area) => ({
  id: area.id,
  name: area.name,
  city: area.city,
  state: area.state,
  countryCode: area.countryCode,
  slug: area.slug,
});

const statusPayload = (area, reports) => {
  const derived = deriveStatus(reports, config.freshness);
  return {
    ...areaPayload(area),
    status: derived.status,
    freshness: derived.freshness,
    confidence: derived.confidence,
    latestReportAt: derived.latestReportAt,
    eligibleReportCount: derived.eligibleReportCount,
    staleReportCount: derived.staleReportCount,
    supportingCount: derived.supportingCount,
    opposingCount: derived.opposingCount,
    staleOnly: derived.staleOnly,
    statusExplanation: derived.explanation,
  };
};

const freshnessMeta = () => ({
  freshMinutes: config.freshness.freshMinutes,
  agingMinutes: config.freshness.agingMinutes,
  agreementWindowMinutes: config.freshness.agreementWindowMinutes,
  agreementMinReports: config.freshness.agreementMin,
  duplicateCooldownMinutes: config.duplicateCooldownMinutes,
  rateLimits: {
    perArea: config.limits.perArea,
    perAreaWindowMinutes: config.limits.areaWindowMinutes,
    daily: config.limits.daily,
  },
});

api.get('/health', (_req, res) => {
  res.json({ ok: true, env: config.nodeEnv });
});

api.get('/meta', (_req, res) => {
  res.json({
    product: 'LightWatch',
    sourceLabel: 'Community report',
    thresholds: freshnessMeta(),
  });
});

api.get('/neighbourhoods', (req, res) => {
  const query = typeof req.query.q === 'string' ? req.query.q.slice(0, 80) : '';
  const areas = store.listNeighbourhoods({ query });

  // Attach derived status so search results never have to guess. One shared
  // pass over recent reports keeps this cheap for a pilot-sized list.
  const reports = store.allVisibleReports({ lookbackHours: 24 });
  const byArea = new Map();
  for (const report of reports) {
    if (!byArea.has(report.neighbourhoodId)) byArea.set(report.neighbourhoodId, []);
    byArea.get(report.neighbourhoodId).push(report);
  }

  res.json({
    neighbourhoods: areas.map((area) => statusPayload(area, byArea.get(area.id) || [])),
    query,
  });
});

api.get('/overview', (_req, res, next) => {
  try {
    const areas = store.listNeighbourhoods();
    const reports = store.allVisibleReports({ lookbackHours: 24 });
    const byArea = new Map();
    for (const report of reports) {
      if (!byArea.has(report.neighbourhoodId)) byArea.set(report.neighbourhoodId, []);
      byArea.get(report.neighbourhoodId).push(report);
    }
    const neighbourhoods = areas.map((area) =>
      statusPayload(area, byArea.get(area.id) || []),
    );
    const metrics = store.metrics();
    res.json({
      neighbourhoods,
      metrics: {
        ...metrics,
        supportedAreas: areas.length,
      },
      thresholds: freshnessMeta(),
    });
  } catch (error) {
    next(error);
  }
});

api.get('/neighbourhoods/:slug', (req, res) => {
  const area = store.getNeighbourhoodBySlug(req.params.slug);
  if (!area) return res.status(404).json({ error: 'not_found', message: 'That neighbourhood is not currently supported.' });
  if (!area.isActive) return res.status(410).json({ error: 'inactive', message: 'Coverage for this neighbourhood has been paused.' });

  const derivedFrom = store.reportsForDerivation(area.id, { lookbackHours: 24 });
  res.json({
    neighbourhood: statusPayload(area, derivedFrom),
    reports: derivedFrom.slice(0, 30),
    thresholds: freshnessMeta(),
  });
});

api.get('/reports/recent', (req, res) => {
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 12));
  res.json({ reports: store.recentReports({ limit }), thresholds: freshnessMeta() });
});

api.post('/reports', (req, res) => {
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const identifier = typeof body.neighbourhoodId === 'string' ? body.neighbourhoodId : '';
  const slug = typeof body.neighbourhoodSlug === 'string' ? body.neighbourhoodSlug : '';
  const rawStatus = body.status === 'ON' || body.status === 'OFF' ? body.status : '';
  const acknowledged = body.observationAcknowledged === true;

  const area = identifier ? store.getNeighbourhoodById(identifier) : slug ? store.getNeighbourhoodBySlug(slug) : null;

  if (!area) {
    return res.status(404).json({
      error: 'unsupported_neighbourhood',
      message: 'Select a supported neighbourhood before submitting a report.',
    });
  }
  if (!area.isActive) {
    return res.status(410).json({
      error: 'inactive_neighbourhood',
      message: 'Coverage for this neighbourhood has been paused, so reports cannot be accepted.',
    });
  }
  if (rawStatus !== 'ON' && rawStatus !== 'OFF') {
    return res.status(400).json({
      error: 'invalid_status',
      message: 'Choose ON or OFF before submitting your report.',
    });
  }
  if (!acknowledged) {
    return res.status(400).json({
      error: 'acknowledgement_required',
      message: 'Please confirm that this report reflects your own observation.',
    });
  }

  const fingerprint = clientFingerprint(req);
  const existing = store.latestByFingerprint({
    fingerprint,
    neighbourhoodId: area.id,
    minutes: config.duplicateCooldownMinutes,
  });
  if (existing) {
    return res.status(409).json({
      error: 'duplicate',
      message: `You've recently submitted a report for this neighbourhood. Please wait ${config.duplicateCooldownMinutes} minutes before submitting another.`,
    });
  }

  const areaCount = store.countRecentByFingerprint({
    fingerprint,
    neighbourhoodId: area.id,
    minutes: config.limits.areaWindowMinutes,
  });
  if (areaCount >= config.limits.perArea) {
    return res.status(429).json({
      error: 'rate_limited_area',
      message: `You've submitted several reports for this neighbourhood recently. Please try again after ${config.limits.areaWindowMinutes} minutes.`,
    });
  }

  const dailyCount = store.countRecentByFingerprint({
    fingerprint,
    minutes: 24 * 60,
  });
  if (dailyCount >= config.limits.daily) {
    return res.status(429).json({
      error: 'rate_limited_daily',
      message: 'Too many reports have been submitted from this connection. Please try again later.',
    });
  }

  // Server owns the timestamp. Any client-provided time is ignored.
  const row = store.insertReport({
    neighbourhoodId: area.id,
    status: rawStatus,
    fingerprint,
  });

  const report = {
    id: row.id,
    neighbourhoodId: row.neighbourhood_id,
    areaName: row.area_name,
    areaSlug: row.area_slug,
    status: row.status,
    sourceType: row.source_type,
    verificationState: row.verification_state,
    createdAt: row.created_at,
    freshness: 'FRESH',
    isDemo: false,
  };

  const derivedFrom = store.reportsForDerivation(area.id, { lookbackHours: 24 });

  res.status(201).json({
    success: true,
    report,
    neighbourhood: statusPayload(area, derivedFrom),
    message: 'Thanks for sharing an update. Your report has been received.',
  });
});

api.use((_req, res) => {
  res.status(404).json({ error: 'not_found', message: 'That resource is not available.' });
});

api.use((error, _req, res, _next) => {
  console.error('[api]', error);
  res.status(500).json({
    error: 'server_error',
    message: 'Something went wrong on our side. Please try again in a moment.',
  });
});
