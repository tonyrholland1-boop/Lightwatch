/**
 * Reset helper for local development.
 *
 *   npm run seed:reset          re-age the demo reports so every state is visible
 *   npm run seed:reset -- --wipe  delete the database entirely, then re-seed
 *
 * Real (non-demo) reports are never touched unless --wipe is passed.
 */
import fs from 'node:fs';
import path from 'node:path';

const wipe = process.argv.includes('--wipe');
const { config } = await import('../server/config.js');

if (wipe) {
  for (const file of ['lightwatch.sqlite', 'lightwatch.sqlite-wal', 'lightwatch.sqlite-shm']) {
    const target = path.join(config.dataDir, file);
    if (fs.existsSync(target)) {
      fs.rmSync(target);
      console.log(`removed ${path.relative(process.cwd(), target)}`);
    }
  }
}

const { db, seedDemoReports } = await import('../server/db.js');
seedDemoReports({ force: true });

const count = (sql) => db.prepare(sql).get().total;
console.log(
  [
    `demo reports: ${count('SELECT COUNT(*) AS total FROM electricity_reports WHERE is_demo = 1')}`,
    `real reports: ${count('SELECT COUNT(*) AS total FROM electricity_reports WHERE is_demo = 0')}`,
    `neighbourhoods: ${count('SELECT COUNT(*) AS total FROM neighbourhoods')}`,
  ].join(' · '),
);
console.log('Demo data is labelled "Demo" in the interface; it is never presented as live.');
