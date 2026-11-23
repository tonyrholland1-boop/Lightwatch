import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { config } from './config.js';
import { freshnessForReport } from './status.js';

fs.mkdirSync(config.dataDir, { recursive: true });
const dbPath = config.dbPathOverride || path.join(config.dataDir, 'lightwatch.sqlite');
const db = new DatabaseSync(dbPath);

db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

db.exec(`
  CREATE TABLE IF NOT EXISTS neighbourhoods (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    country_code TEXT NOT NULL DEFAULT 'NG',
    slug TEXT NOT NULL UNIQUE,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS electricity_reports (
    id TEXT PRIMARY KEY,
    neighbourhood_id TEXT NOT NULL REFERENCES neighbourhoods(id),
    status TEXT NOT NULL CHECK (status IN ('ON', 'OFF')),
    source_type TEXT NOT NULL DEFAULT 'COMMUNITY',
    verification_state TEXT NOT NULL DEFAULT 'UNVERIFIED',
    created_at TEXT NOT NULL,
    request_fingerprint TEXT NOT NULL,
    is_hidden INTEGER NOT NULL DEFAULT 0,
    is_demo INTEGER NOT NULL DEFAULT 0,
    moderation_reason TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_reports_area_created
    ON electricity_reports (neighbourhood_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_reports_created
    ON electricity_reports (created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_reports_fingerprint
    ON electricity_reports (request_fingerprint, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_areas_active
    ON neighbourhoods (is_active, name);
`);

const NEIGHBOURHOODS = [
  ['Lekki Phase 1', 'Lekki', 'Lagos', 'lekki-phase-1'],
  ['Lekki Phase 2', 'Lekki', 'Lagos', 'lekki-phase-2'],
  ['Ikoyi', 'Lagos Island', 'Lagos', 'ikoyi'],
  ['Victoria Island', 'Lagos Island', 'Lagos', 'victoria-island'],
  ['Ikeja GRA', 'Ikeja', 'Lagos', 'ikeja-gra'],
  ['Yaba', 'Lagos Mainland', 'Lagos', 'yaba'],
  ['Surulere', 'Lagos Mainland', 'Lagos', 'surulere'],
  ['Gbagada', 'Lagos Mainland', 'Lagos', 'gbagada'],
  ['Magodo', 'Kosofe', 'Lagos', 'magodo'],
  ['Ajah', 'Eti-Osa', 'Lagos', 'ajah'],
  ['Festac Town', 'Amuwo-Odofin', 'Lagos', 'festac-town'],
  ['Ogba', 'Ikeja', 'Lagos', 'ogba'],
  ['Wuse 2', 'Abuja', 'FCT', 'wuse-2'],
  ['Garki', 'Abuja', 'FCT', 'garki'],
  ['Maitama', 'Abuja', 'FCT', 'maitama'],
];

const DEMO_REPORTS = [
  // minutesAgo, status
  ['lekki-phase-1', [7, 'ON'], [11, 'ON'], [19, 'ON'], [26, 'ON'], [42, 'ON'], [88, 'OFF']],
  ['ikoyi', [9, 'OFF'], [21, 'OFF'], [34, 'OFF'], [67, 'ON']],
  ['yaba', [6, 'ON'], [13, 'OFF'], [24, 'ON'], [29, 'OFF']],
  ['surulere', [16, 'ON']],
  ['victoria-island', [47, 'ON'], [63, 'ON'], [101, 'ON']],
  ['ikeja-gra', [184, 'OFF'], [236, 'OFF'], [301, 'ON']],
  ['magodo', [12, 'OFF'], [23, 'OFF'], [58, 'OFF']],
  ['ajah', [8, 'OFF']],
  ['festac-town', [52, 'ON'], [71, 'ON'], [96, 'ON'], [114, 'ON']],
  ['lekki-phase-2', [74, 'OFF']],
  ['wuse-2', [14, 'ON'], [24, 'ON']],
  ['maitama', [10, 'ON'], [15, 'OFF'], [22, 'ON']],
  ['gbagada'],
  ['ogba'],
  ['garki'],
];

const nowIso = () => new Date().toISOString();
const minutesAgo = (minutes) => new Date(Date.now() - minutes * 60000).toISOString();

function seedNeighbourhoods() {
  const insert = db.prepare(`
    INSERT INTO neighbourhoods (id, name, city, state, country_code, slug, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
  `);
  const exists = db.prepare('SELECT id FROM neighbourhoods WHERE slug = ?');
  for (const [name, city, state, slug] of NEIGHBOURHOODS) {
    if (exists.get(slug)) continue;
    const timestamp = nowIso();
    insert.run(crypto.randomUUID(), name, city, state, 'NG', slug, timestamp, timestamp);
  }
}

function seedDemoReports({ force = false } = {}) {
  if (!config.seedDemoData) return;
  const latest = db
    .prepare('SELECT MAX(created_at) AS latest FROM electricity_reports WHERE is_demo = 1')
    .get();
  const newestMs = latest?.latest ? new Date(latest.latest).getTime() : 0;
  const stale = Date.now() - newestMs > 3 * 60 * 60 * 1000;
  if (!force && !stale) return;

  db.prepare('DELETE FROM electricity_reports WHERE is_demo = 1').run();
  const findArea = db.prepare('SELECT id FROM neighbourhoods WHERE slug = ?');
  const insert = db.prepare(`
    INSERT INTO electricity_reports
      (id, neighbourhood_id, status, source_type, verification_state, created_at,
       request_fingerprint, is_hidden, is_demo, moderation_reason)
    VALUES (?, ?, ?, 'COMMUNITY', 'UNVERIFIED', ?, ?, 0, 1, NULL)
  `);
  for (const [slug, ...reports] of DEMO_REPORTS) {
    const area = findArea.get(slug);
    if (!area) continue;
    for (const entry of reports) {
      if (!Array.isArray(entry) || entry.length !== 2) continue;
      const [age, status] = entry;
      insert.run(
        crypto.randomUUID(),
        area.id,
        status,
        minutesAgo(age),
        `demo-${crypto.createHash('sha256').update(`${slug}-${age}-${status}`).digest('hex').slice(0, 16)}`,
      );
    }
  }
}

const mapArea = (row) =>
  row && {
    id: row.id,
    name: row.name,
    city: row.city,
    state: row.state,
    countryCode: row.country_code,
    slug: row.slug,
    isActive: Boolean(row.is_active),
  };

const mapReport = (row, thresholds, nowMs = Date.now()) =>
  row && {
    id: row.id,
    neighbourhoodId: row.neighbourhood_id,
    areaName: row.area_name,
    areaSlug: row.area_slug,
    status: row.status,
    sourceType: row.source_type,
    verificationState: row.verification_state,
    createdAt: row.created_at,
    freshness: freshnessForReport(row.created_at, thresholds, nowMs),
    isHidden: Boolean(row.is_hidden),
    isDemo: Boolean(row.is_demo),
  };

export const store = {
  listNeighbourhoods({ query = '', activeOnly = true } = {}) {
    const trimmed = query.trim();
    let rows;
    if (trimmed) {
      rows = db
        .prepare(`
          SELECT * FROM neighbourhoods
          WHERE is_active = ?
            AND (LOWER(name) LIKE ? OR LOWER(city) LIKE ? OR LOWER(state) LIKE ?)
          ORDER BY name COLLATE NOCASE ASC
        `)
        .all(
          activeOnly ? 1 : 0,
          `%${trimmed.toLowerCase()}%`,
          `%${trimmed.toLowerCase()}%`,
          `%${trimmed.toLowerCase()}%`,
        );
    } else {
      rows = db
        .prepare(`
          SELECT * FROM neighbourhoods
          WHERE is_active = ?
          ORDER BY name COLLATE NOCASE ASC
        `)
        .all(activeOnly ? 1 : 0);
    }
    return rows.map(mapArea);
  },

  getNeighbourhoodBySlug(slug) {
    return mapArea(
      db.prepare('SELECT * FROM neighbourhoods WHERE slug = ?').get(String(slug).toLowerCase()),
    );
  },

  getNeighbourhoodById(id) {
    return mapArea(db.prepare('SELECT * FROM neighbourhoods WHERE id = ?').get(id));
  },

  reportsForArea(areaId, { limit = 40 } = {}) {
    return db
      .prepare(`
        SELECT r.*, n.name AS area_name, n.slug AS area_slug
        FROM electricity_reports r
        JOIN neighbourhoods n ON n.id = r.neighbourhood_id
        WHERE r.neighbourhood_id = ?
          AND r.is_hidden = 0
          AND r.created_at >= ?
        ORDER BY r.created_at DESC
        LIMIT ?
      `)
      .all(
        areaId,
        new Date(Date.now() - config.freshness.agingMinutes * 60000).toISOString(),
        limit,
      )
      .map((row) => mapReport(row, config.freshness));
  },

  /**
   * Reports used for status derivation. Deliberately reaches beyond the
   * freshness window so "stale reports exist" can be distinguished from
   * "nothing has ever been reported".
   */
  reportsForDerivation(areaId, { lookbackHours = 24 } = {}) {
    return db
      .prepare(`
        SELECT r.*, n.name AS area_name, n.slug AS area_slug
        FROM electricity_reports r
        JOIN neighbourhoods n ON n.id = r.neighbourhood_id
        WHERE r.neighbourhood_id = ?
          AND r.created_at >= ?
        ORDER BY r.created_at DESC
        LIMIT 200
      `)
      .all(areaId, new Date(Date.now() - lookbackHours * 3600000).toISOString())
      .map((row) => mapReport(row, config.freshness));
  },

  recentReports({ limit = 12, hours = 24 } = {}) {
    return db
      .prepare(`
        SELECT r.*, n.name AS area_name, n.slug AS area_slug
        FROM electricity_reports r
        JOIN neighbourhoods n ON n.id = r.neighbourhood_id
        WHERE r.is_hidden = 0
          AND r.created_at >= ?
        ORDER BY r.created_at DESC
        LIMIT ?
      `)
      .all(new Date(Date.now() - hours * 3600000).toISOString(), limit)
      .map((row) => mapReport(row, config.freshness));
  },

  /** All visible reports in a 24h lookback, for status derivation at scale. */
  allVisibleReports({ lookbackHours = 24 } = {}) {
    return db
      .prepare(`
        SELECT r.*, n.name AS area_name, n.slug AS area_slug
        FROM electricity_reports r
        JOIN neighbourhoods n ON n.id = r.neighbourhood_id
        WHERE r.is_hidden = 0
          AND r.created_at >= ?
        ORDER BY r.created_at DESC
      `)
      .all(new Date(Date.now() - lookbackHours * 3600000).toISOString())
      .map((row) => mapReport(row, config.freshness));
  },

  insertReport({ neighbourhoodId, status, fingerprint, isDemo = false, createdAt = nowIso() }) {
    const id = crypto.randomUUID();
    db.prepare(`
      INSERT INTO electricity_reports
        (id, neighbourhood_id, status, source_type, verification_state, created_at,
         request_fingerprint, is_hidden, is_demo, moderation_reason)
      VALUES (?, ?, ?, 'COMMUNITY', 'UNVERIFIED', ?, ?, 0, ?, NULL)
    `).run(id, neighbourhoodId, status, createdAt, fingerprint, isDemo ? 1 : 0);
    return db
      .prepare(`
        SELECT r.*, n.name AS area_name, n.slug AS area_slug
        FROM electricity_reports r
        JOIN neighbourhoods n ON n.id = r.neighbourhood_id
        WHERE r.id = ?
      `)
      .get(id);
  },

  countRecentByFingerprint({ fingerprint, neighbourhoodId = null, minutes, status = null }) {
    const since = new Date(Date.now() - minutes * 60000).toISOString();
    if (neighbourhoodId && status) {
      return db
        .prepare(`
          SELECT COUNT(*) AS total FROM electricity_reports
          WHERE request_fingerprint = ? AND neighbourhood_id = ? AND created_at >= ? AND status = ?
        `)
        .get(fingerprint, neighbourhoodId, since, status).total;
    }
    if (neighbourhoodId) {
      return db
        .prepare(`
          SELECT COUNT(*) AS total FROM electricity_reports
          WHERE request_fingerprint = ? AND neighbourhood_id = ? AND created_at >= ?
        `)
        .get(fingerprint, neighbourhoodId, since).total;
    }
    return db
      .prepare('SELECT COUNT(*) AS total FROM electricity_reports WHERE request_fingerprint = ? AND created_at >= ?')
      .get(fingerprint, since).total;
  },

  latestByFingerprint({ fingerprint, neighbourhoodId, minutes }) {
    const since = new Date(Date.now() - minutes * 60000).toISOString();
    return db
      .prepare(`
        SELECT * FROM electricity_reports
        WHERE request_fingerprint = ? AND neighbourhood_id = ? AND created_at >= ?
        ORDER BY created_at DESC LIMIT 1
      `)
      .get(fingerprint, neighbourhoodId, since);
  },

  metrics() {
    const since24h = new Date(Date.now() - 24 * 3600000).toISOString();
    const sinceWindow = new Date(
      Date.now() - config.freshness.agingMinutes * 60000,
    ).toISOString();

    const reports24h = db
      .prepare(
        'SELECT COUNT(*) AS total FROM electricity_reports WHERE is_hidden = 0 AND created_at >= ?',
      )
      .get(since24h).total;

    const liveReports24h = db
      .prepare(`
        SELECT COUNT(*) AS total FROM electricity_reports
        WHERE is_hidden = 0 AND is_demo = 0 AND created_at >= ?
      `)
      .get(since24h).total;

    const activeAreas = db
      .prepare('SELECT COUNT(*) AS total FROM neighbourhoods WHERE is_active = 1')
      .get().total;

    const rows = db
      .prepare(`
        SELECT created_at FROM electricity_reports
        WHERE is_hidden = 0 AND created_at >= ?
      `)
      .all(since24h);

    const ages = rows
      .map((row) => (Date.now() - new Date(row.created_at).getTime()) / 60000)
      .sort((a, b) => a - b);

    const medianAgeMinutes = ages.length ? Math.round(ages[Math.floor(ages.length / 2)]) : null;

    const areasWithRecentReports = db
      .prepare(`
        SELECT COUNT(DISTINCT neighbourhood_id) AS total FROM electricity_reports
        WHERE is_hidden = 0 AND created_at >= ?
      `)
      .get(sinceWindow).total;

    const demoReports24h = db
      .prepare(`
        SELECT COUNT(*) AS total FROM electricity_reports
        WHERE is_hidden = 0 AND is_demo = 1 AND created_at >= ?
      `)
      .get(since24h).total;

    return {
      reports24h,
      liveReports24h,
      demoReports24h,
      activeAreas,
      medianAgeMinutes,
      areasWithRecentReports,
    };
  },
};

seedNeighbourhoods();
seedDemoReports();

export { db, seedDemoReports };
