import path from 'node:path';

const positiveNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const config = {
  port: positiveNumber(process.env.PORT, 5173),
  nodeEnv: process.env.NODE_ENV || 'development',
  freshness: {
    freshMinutes: positiveNumber(process.env.FRESH_MINUTES, 30),
    agingMinutes: positiveNumber(process.env.REPORT_WINDOW_MINUTES, 120),
    agreementWindowMinutes: positiveNumber(process.env.AGREEMENT_WINDOW_MINUTES, 30),
    agreementMin: Math.max(2, positiveNumber(process.env.AGREEMENT_MIN_REPORTS, 2)),
  },
  limits: {
    perArea: positiveNumber(process.env.RATE_LIMIT_PER_AREA, 3),
    areaWindowMinutes: positiveNumber(process.env.RATE_LIMIT_WINDOW_MINUTES, 30),
    daily: positiveNumber(process.env.RATE_LIMIT_DAILY, 10),
  },
  duplicateCooldownMinutes: positiveNumber(process.env.DUPLICATE_COOLDOWN_MINUTES, 10),
  fingerprintSalt: process.env.FINGERPRINT_SALT || 'lightwatch-local-development-salt',
  dataDir: process.env.DATA_DIR || path.resolve(process.cwd(), 'data'),
  dbPathOverride: process.env.DATABASE_PATH || null,
  seedDemoData: process.env.SEED_DEMO_DATA !== 'false',
  contactEmail: process.env.CONTACT_EMAIL || 'feedback@lightwatch.ng',
};
