import { useState } from 'react';
import { Icon, StatusIcon } from './icons.jsx';
import { statusMeta, timeAgo } from '../lib/format.js';
import { useRevealOnScroll } from '../lib/useMotion.js';

const STATUS_ORDER = ['ON', 'OFF', 'CONFLICTED', 'UNKNOWN'];

const STATUS_COLOR = {
  ON: 'var(--status-on)',
  OFF: 'var(--status-off)',
  UNKNOWN: 'var(--status-unknown)',
  CONFLICTED: 'var(--status-conflicted)',
};

const STATUS_LABEL = {
  ON: 'Reported on',
  OFF: 'Reported off',
  CONFLICTED: 'Conflicted',
  UNKNOWN: 'Not reported',
};

/**
 * Coverage readings: real counts from the live overview, rendered as a
 * labelled distribution so the section always shows measured data rather
 * than a decorative shape.
 */
function CoverageReadings({ areas, onSelect, selectedSlug }) {
  const counts = STATUS_ORDER.map((status) => ({
    status,
    count: areas.filter((area) => area.status === status).length,
  }));
  const total = areas.length;
  const reporting = areas.filter((area) => area.eligibleReportCount > 0).length;
  const sorted = [...areas].sort(
    (a, b) => (b.eligibleReportCount || 0) - (a.eligibleReportCount || 0),
  );

  if (total === 0) {
    return (
      <div className="coverage-empty" role="status">
        <p className="coverage-empty__title">No coverage loaded yet.</p>
        <p className="coverage-empty__copy">
          The pilot list arrives with the first status check. Nothing here is guessed —
          areas appear only once they are supported.
        </p>
      </div>
    );
  }

  return (
    <div className="readings">
      <div className="readings__bar" role="img" aria-label={`Status split across ${total} neighbourhoods`}>
        {counts.map(({ status, count }) =>
          count > 0 ? (
            <span
              key={status}
              className="readings__seg"
              data-status={status}
              style={{ flexGrow: count, background: STATUS_COLOR[status] }}
              title={`${STATUS_LABEL[status]}: ${count}`}
            />
          ) : null,
        )}
      </div>

      <dl className="readings__legend">
        {counts.map(({ status, count }) => (
          <div className="readings__key" key={status}>
            <dt>
              <span className="readings__dot" style={{ background: STATUS_COLOR[status] }} />
              {STATUS_LABEL[status]}
            </dt>
            <dd>
              <strong>{count}</strong>
              <span>{total ? Math.round((count / total) * 100) : 0}%</span>
            </dd>
          </div>
        ))}
      </dl>

      <p className="readings__note">
        <strong>{reporting}</strong> of {total} neighbourhoods have a report in the last
        two hours. The rest stay unreported until someone shares an observation.
      </p>

      <div className="readings__list-head">
        <p className="readings__list-title">Reports by neighbourhood</p>
        <p className="readings__list-unit">eligible now</p>
      </div>
      <ul className="readings__list">
        {sorted.map((area) => {
          const max = Math.max(1, ...areas.map((item) => item.eligibleReportCount || 0));
          const pct = ((area.eligibleReportCount || 0) / max) * 100;
          return (
            <li key={area.id}>
              <button
                type="button"
                className="readings__row"
                data-selected={area.slug === selectedSlug}
                onClick={() => onSelect(area)}
              >
                <span className="readings__name">{area.name}</span>
                <span className="readings__track">
                  <span
                    className="readings__fill"
                    style={{ width: `${Math.max(pct, area.eligibleReportCount ? 6 : 0)}%` }}
                    data-status={area.status}
                  />
                </span>
                <span className="readings__value">{area.eligibleReportCount || 0}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function AreaCard({ area, selected, onSelect, style }) {
  const meta = statusMeta(area.status);
  return (
    <button
      type="button"
      className="area-card fade-in"
      data-selected={selected}
      onClick={() => onSelect(area)}
      aria-current={selected ? 'true' : undefined}
      style={style}
    >
      <span className="area-card__top">
        <span>
          <span className="area-card__name">{area.name}</span>
          <span className="area-card__place">
            {area.city} · {area.state}
          </span>
        </span>
        <span className={`status-token status-token--${meta.tone}`}>
          <StatusIcon status={area.status} size={13} />
          {meta.short}
        </span>
      </span>
      <span className="area-card__bottom">
        <span className="area-card__status">
          <Icon name="clock" size={12} style={{ color: 'var(--faint)' }} />
          {area.latestReportAt ? timeAgo(area.latestReportAt) : 'No recent reports'}
        </span>
        <span className="area-card__age">
          {area.eligibleReportCount > 0
            ? `${area.eligibleReportCount} ${area.eligibleReportCount === 1 ? 'report' : 'reports'}`
            : 'Awaiting first report'}
        </span>
      </span>
    </button>
  );
}

const FILTERS = [
  { id: 'all', label: 'All areas' },
  { id: 'reporting', label: 'Reporting now' },
  { id: 'unreported', label: 'No reports' },
];

export default function Coverage({
  areas,
  selectedSlug,
  onSelect,
  onScrollTo,
  loading,
}) {
  const [filter, setFilter] = useState('all');
  const revealRef = useRevealOnScroll();

  const visible = areas.filter((area) => {
    if (filter === 'reporting') return area.eligibleReportCount > 0;
    if (filter === 'unreported') return area.eligibleReportCount === 0;
    return true;
  });

  const cities = [...new Set(areas.map((area) => area.state))];

  return (
    <section className="section" id="coverage" aria-labelledby="coverage-heading">
      <div className="shell reveal-on-scroll" ref={revealRef}>
        <div className="explorer__toolbar">
          <div className="explorer__intro">
            <p className="eyebrow" style={{ marginBottom: 18 }}>
              Coverage
            </p>
            <h2 className="chapter" id="coverage-heading">
              A short list, kept <em className="serif-italic">honest</em>.
            </h2>
            <p className="coverage__count">
              <span className="coverage__count-num">{areas.length}</span>
              supported {areas.length === 1 ? 'neighbourhood' : 'neighbourhoods'} across{' '}
              {cities.length} states
            </p>
            <p className="lead explorer__lead">
              We only list areas we can cover in this pilot, across {cities.length > 0 ? cities.length : 2} states.
              An empty area is shown as unreported — never guessed.
            </p>
          </div>
        </div>

        <div className="explorer__layout">
          <div className="explorer__left">
            <div className="readings-panel">
              <div className="case__rim" aria-hidden="true" />
              <div className="readings-panel__head">
                <p className="readings-panel__title">Where reports stand</p>
                <p className="readings-panel__meta">Live counts</p>
              </div>
              {loading && areas.length === 0 ? (
                <div className="skeleton-stack" aria-busy="true">
                  <span className="sr-only">Loading coverage readings</span>
                  <div className="skeleton skeleton--text" style={{ width: '62%' }} />
                  <div className="skeleton skeleton--row" />
                  <div className="skeleton skeleton--row" />
                  <div className="skeleton skeleton--row" />
                </div>
              ) : (
                <CoverageReadings
                  areas={areas}
                  selectedSlug={selectedSlug}
                  onSelect={onSelect}
                />
              )}
            </div>
          </div>

          <div>
            <div className="explorer__filters" role="group" aria-label="Filter neighbourhoods">
              {FILTERS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className="filter-pill"
                  aria-pressed={filter === option.id}
                  onClick={() => setFilter(option.id)}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div style={{ marginTop: 20 }}>
              {loading && areas.length === 0 ? (
                <div className="areas" aria-busy="true">
                  <span className="sr-only">Loading neighbourhood coverage</span>
                  {[0, 1, 2, 3, 4, 5].map((index) => (
                    <div className="skeleton skeleton--card" key={index} aria-hidden="true" />
                  ))}
                </div>
              ) : visible.length === 0 ? (
                <div className="areas__empty">
                  Nothing matches this filter yet. Areas without reports stay visible so
                  coverage is never overstated.
                </div>
              ) : (
                <div className="areas">
                  {visible.map((area, index) => (
                    <AreaCard
                      key={area.id}
                      area={area}
                      selected={area.slug === selectedSlug}
                      onSelect={onSelect}
                      style={{ animationDelay: `${Math.min(index, 5) * 55}ms` }}
                    />
                  ))}
                </div>
              )}
            </div>

            <p className="caption-muted" style={{ marginTop: 20 }}>
              Can&rsquo;t find your area?{' '}
              <button
                type="button"
                className="link-inline"
                onClick={() => onScrollTo('trust')}
              >
                Suggest it for coverage
              </button>
              . New areas are added after review, not automatically.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
