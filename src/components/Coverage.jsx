import { useState } from 'react';
import { Icon, StatusIcon } from './icons.jsx';
import NeighbourhoodSearch from './NeighbourhoodSearch.jsx';
import { statusMeta, timeAgo } from '../lib/format.js';

/**
 * Approximate relative positions (0–100) for a schematic pilot map.
 * Deliberately illustrative, not a geographic reference.
 */
const MAP_POSITIONS = {
  'lekki-phase-1': [62, 68],
  'lekki-phase-2': [67, 78],
  ikoyi: [52, 64],
  'victoria-island': [56, 58],
  'ikeja-gra': [33, 26],
  yaba: [36, 45],
  surulere: [31, 54],
  gbagada: [44, 42],
  magodo: [24, 35],
  ajah: [78, 76],
  'festac-town': [16, 68],
  ogba: [30, 33],
  'wuse-2': [88, 18],
  garki: [83, 27],
  maitama: [86, 12],
};

const STATUS_COLOR = {
  ON: '#a6ff70',
  OFF: '#e45d5d',
  UNKNOWN: '#6a6d79',
  CONFLICTED: '#d9a441',
};

function PilotMap({ areas, selectedSlug, onSelect }) {
  const [hover, setHover] = useState(null);

  return (
    <div className="map">
      <div className="grain" aria-hidden="true" />
      <svg
        viewBox="0 0 100 72"
        width="100%"
        height="100%"
        role="group"
        aria-label="Schematic map of supported neighbourhoods"
        style={{ position: 'absolute', inset: 0 }}
      >
        <defs>
          <pattern id="grid" width="8" height="8" patternUnits="userSpaceOnUse">
            <path d="M 8 0 L 0 0 0 8" className="map__grid-line" strokeWidth="0.16" />
          </pattern>
        </defs>
        <rect width="100" height="72" fill="url(#grid)" opacity="0.85" />
        {/* Schematic Lagos coastline + lagoon suggestion */}
        <path
          className="map__shore"
          d="M0 50 C 12 47, 18 52, 28 50 S 44 44, 52 47 S 68 55, 78 52 S 96 44, 100 47 L100 72 L0 72 Z"
        />
        <path className="map__shore" d="M30 44 C 38 40, 46 41, 50 36 S 60 30, 64 34" opacity="0.5" />
        {/* Schematic Abuja cluster divider */}
        <line x1="72" y1="0" x2="76" y2="36" stroke="rgba(255,255,255,0.05)" strokeWidth="0.2" strokeDasharray="1 1.4" />

        {areas.map((area) => {
          const [x, y] = MAP_POSITIONS[area.slug] || [50, 36];
          const color = STATUS_COLOR[area.status] || STATUS_COLOR.UNKNOWN;
          const isSelected = area.slug === selectedSlug;
          const isActive = hover?.slug === area.slug;
          return (
            <g
              key={area.id}
              className="map__pin"
              data-selected={isSelected}
              transform={`translate(${x} ${y})`}
              onMouseEnter={() => setHover(area)}
              onMouseLeave={() => setHover(null)}
              onClick={() => onSelect(area)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onSelect(area);
                }
              }}
              onFocus={() => setHover(area)}
              onBlur={() => setHover(null)}
              tabIndex={0}
              role="button"
              aria-label={`${area.name}, ${area.city}: ${statusMeta(area.status).short}${
                area.latestReportAt ? `, reported ${timeAgo(area.latestReportAt)}` : ''
              }`}
            >
              <circle
                className="map__pin-ring"
                r={isActive || isSelected ? 3.6 : 3}
                stroke={color}
              />
              <circle r="1.35" fill={color} opacity={0.9} />
              <circle r="4.4" fill={color} opacity={0.09} />
            </g>
          );
        })}
      </svg>

      {hover && MAP_POSITIONS[hover.slug] && (
        <div
          className="map__tooltip"
          style={{ left: `${MAP_POSITIONS[hover.slug][0]}%`, top: `${MAP_POSITIONS[hover.slug][1] * (100 / 72)}%` }}
        >
          <strong>{hover.name}</strong>
          <span>
            {statusMeta(hover.status).short}
            {hover.latestReportAt ? ` · ${timeAgo(hover.latestReportAt)}` : ''}
          </span>
        </div>
      )}

      <div className="map__legend">
        <span>
          <i style={{ background: STATUS_COLOR.ON }} /> Reported ON
        </span>
        <span>
          <i style={{ background: STATUS_COLOR.OFF }} /> Reported OFF
        </span>
        <span>
          <i style={{ background: STATUS_COLOR.CONFLICTED }} /> Conflicted
        </span>
        <span>
          <i style={{ background: STATUS_COLOR.UNKNOWN }} /> Not reported
        </span>
      </div>
    </div>
  );
}

function AreaCard({ area, selected, onSelect }) {
  const meta = statusMeta(area.status);
  return (
    <button
      type="button"
      className="area-card"
      data-selected={selected}
      onClick={() => onSelect(area)}
      aria-current={selected ? 'true' : undefined}
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

  const visible = areas.filter((area) => {
    if (filter === 'reporting') return area.eligibleReportCount > 0;
    if (filter === 'unreported') return area.eligibleReportCount === 0;
    return true;
  });

  const cities = [...new Set(areas.map((area) => area.state))];

  return (
    <section className="section" id="coverage" aria-labelledby="coverage-heading">
      <div className="shell">
        <div className="explorer__toolbar">
          <div style={{ maxWidth: 640 }}>
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
            <p className="lead" style={{ marginTop: 24, maxWidth: '52ch' }}>
              We only list areas we can cover in this pilot, across {cities.length > 0 ? cities.length : 2} states.
              An empty area is shown as unreported — never guessed.
            </p>
          </div>
          <div style={{ width: '100%', maxWidth: 360 }}>
            <NeighbourhoodSearch
              areas={areas}
              onSelect={onSelect}
              placeholder="Jump to an area"
            />
          </div>
        </div>

        <div className="explorer__layout">
          <div className="explorer__left">
            <PilotMap areas={areas} selectedSlug={selectedSlug} onSelect={onSelect} />
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
                <div className="feed__loading" aria-busy="true">
                  {[0, 1, 2, 3].map((index) => (
                    <div className="skeleton" key={index} style={{ height: 92 }} />
                  ))}
                </div>
              ) : visible.length === 0 ? (
                <div className="areas__empty">
                  Nothing matches this filter yet. Areas without reports stay visible so
                  coverage is never overstated.
                </div>
              ) : (
                <div className="areas">
                  {visible.map((area) => (
                    <AreaCard
                      key={area.id}
                      area={area}
                      selected={area.slug === selectedSlug}
                      onSelect={onSelect}
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
