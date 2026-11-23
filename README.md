# LightWatch

**Know where there's light. Before you go looking.**

A community-powered electricity status site for Nigerian neighbourhoods. Visitors
search a supported area, read timestamped reports from people nearby, and add
their own ON or OFF observation in a few taps.

Status is derived server-side from community reports. LightWatch never claims to
receive data from a distribution company, and it never labels community input as
official or verified.

---

## Run it

```bash
npm install
npm run dev          # http://localhost:5173
```

The dev server boots Express and mounts Vite in middleware mode, so the API and
the app share one origin and one port.

```bash
npm run build        # production bundle into dist/
npm start            # serve dist/ + API on PORT (default 5173)
npm test             # 32 tests: status derivation + API behaviour
npm run seed:reset   # re-age demo reports so every status is visible
```

Requires Node 22.5+ (uses the built-in `node:sqlite` module, so there is no native
database dependency to compile).

---

## Status model

The server owns the interpretation. The browser never derives status itself.

| Status | Meaning |
| --- | --- |
| `ON` | Recent qualifying reports say power is available |
| `OFF` | Recent qualifying reports say power is unavailable |
| `UNKNOWN` | Too little recent information. **Never** treated as OFF |
| `CONFLICTED` | Recent reports disagree without a clear majority |

Freshness comes from the report timestamp, not the visitor's clock:

| Label | Age |
| --- | --- |
| Fresh | 0–30 minutes |
| Aging | 31–120 minutes |
| Stale | over 120 minutes (excluded from status) |

### Derivation rules

Implemented in `server/status.js` and covered by `test/status.test.js`:

1. Hidden reports are ignored; only reports inside the 120-minute window count.
2. No eligible reports → `UNKNOWN`. If older reports exist, freshness is `STALE`.
3. Inside the 30-minute agreement window, two or more matching reports confirm a
   status. Two matching reports outweigh a single dissent.
4. A tie, or an unresolved mix → `CONFLICTED`.
5. A lone recent report shows its status, flagged `SINGLE` and labelled unverified
   in the interface — unless it contradicts an earlier eligible report, which is
   `CONFLICTED`.
6. Reports between 30 and 120 minutes old still decide the status when nothing
   newer exists, and are marked `AGING`.

Every threshold is configurable by environment variable (see `.env.example`).

---

## Abuse prevention

- Timestamps, `source_type` and `verification_state` are set by the server; client
  values for those fields are ignored (verified by test).
- Only the exact strings `ON` and `OFF` are accepted.
- A repeat report for the same area inside a 10-minute cooldown is rejected (`409`).
- Three accepted reports per area per 30 minutes, ten per day per client (`429`).
- A privacy-preserving fingerprint (HMAC of address + user agent) enforces limits.
  No raw IP address is stored, and the fingerprint is never exposed publicly.

---

## Privacy

No accounts, names, phone numbers, emails or GPS coordinates. The only identifier
stored is the hashed fingerprint described above, used solely for rate limiting.
The interface states the community-reported, unverified nature of the data in the
announcement bar, status card, report feed, footer and FAQ.

---

## Structure

```
server/
  config.js       thresholds, limits, env parsing
  db.js           schema, seed data, queries
  status.js       status derivation (pure, unit-tested)
  api.js          JSON API: search, status, reports
  index.js        Express + Vite middleware / static production host
src/
  App.jsx         data loading, selection, submission, refresh loop
  components/     Nav, Hero, StatusChecker, Coverage, ReportBuilder,
                  HowItWorks, ClosingSections, icons
  lib/            API client, formatting, copy constants
  styles/main.css design tokens and components
test/
  status.test.js  derivation rules
  api.test.js     HTTP contract, validation, rate limits
```

---

## Design

The interface follows the supplied *Slash* art direction: a near-black `#040406`
canvas, Bodoni Moda (the named substitute for IvyPresto) at weight 400 for
editorial headlines, Inter for everything practical, and brushed gold reserved for
short numerical highlights rather than large fills. Panels use the 201° charcoal
gradient with a masked 1px overlay rim; conversion moments use the warm
`#2e2a26` grain horizon.

Functional status colours are the exception to the monochrome rule — green, red,
amber and grey carry real data — and every one of them is paired with a text label
and an icon so colour is never the sole signal. Contrast was checked against the
actual palette; body and metadata text clear WCAG AA.

---

## Notes

- Demo reports are seeded so the four states are visible on first run. They are
  stamped `is_demo` and labelled **Demo** in the feed. They age out like real
  reports, so `npm run seed:reset` re-ages them without touching real submissions.
- The status card refreshes quietly every 90 seconds while the tab is visible, and
  relative timestamps update every 30 seconds without refetching.
- The selected neighbourhood is reflected in the URL (`?area=lekki-phase-1`) so a
  refresh or a shared link restores it.
- There is no live utility feed, by design. The FAQ says so in plain language.
