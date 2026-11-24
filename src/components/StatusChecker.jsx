import { Icon, StatusIcon } from './icons.jsx';
import NeighbourhoodSearch from './NeighbourhoodSearch.jsx';
import {
  absoluteTime,
  freshnessMeta,
  pluralise,
  statusMeta,
  timeAgo,
} from '../lib/format.js';
import { useRevealOnScroll } from '../lib/useMotion.js';

function FreshnessChip({ freshness }) {
  const meta = freshnessMeta(freshness);
  if (!meta) {
    return (
      <span className="chip" title="No reports in the last two hours">
        <span className="chip__dot" aria-hidden="true" style={{ background: 'var(--faint)' }} />
        No recent data
      </span>
    );
  }
  const colors = {
    fresh: 'var(--status-on)',
    aging: 'var(--status-conflicted)',
    stale: 'var(--subtle)',
  };
  return (
    <span className="chip" title={`${meta.label} — ${meta.copy}`}>
      <span className="chip__dot" aria-hidden="true" style={{ background: colors[meta.tone] }} />
      {meta.label}
    </span>
  );
}

function StatusPanel({ detail, onReport, onRefresh, refreshing, thresholds }) {
  const area = detail;
  const meta = statusMeta(area.status);
  const freshness = freshnessMeta(area.freshness);
  const isSingle = area.confidence === 'SINGLE';

  const headline =
    area.status === 'CONFLICTED'
      ? 'Reports disagree right now.'
      : area.status === 'UNKNOWN'
        ? area.staleOnly
          ? 'Too old to confirm.'
          : 'No reports yet.'
        : meta.headline;

  return (
    <div className="checker__panel">
      <div className="case__rim" aria-hidden="true" />
      <div className="checker__top">
        <div className="checker__area">
          <p className="checker__eyebrow">
            <Icon name="pin" size={12} />
            Selected neighbourhood
          </p>
          <h3 className="checker__name">{area.name}</h3>
          <p className="checker__place">
            {area.city}, {area.state} · {area.countryCode}
          </p>
        </div>
        <div className="checker__badges">
          <FreshnessChip freshness={area.freshness} />
          <button
            type="button"
            className="chip chip--action"
            onClick={onRefresh}
            aria-label="Refresh status"
            title="Refresh status"
            disabled={refreshing}
          >
            <Icon
              name="refresh"
              size={12}
              style={refreshing ? { animation: 'spin 1s linear infinite' } : undefined}
            />
          </button>
        </div>
      </div>

      <div className={`status-hero status-hero--${meta.tone}`}>
        <span
          className={`status-hero__icon${area.status === 'ON' ? ' pulse-on' : ''}${
            area.status === 'OFF' ? ' is-off' : ''
          }`}
          aria-hidden="true"
        >
          <StatusIcon status={area.status} size={20} />
        </span>
        <div className="status-hero__body">
          <p className={`status-token status-token--${meta.tone} status-hero__token`}>
            <span className="chip__dot" aria-hidden="true" />
            Status: {area.status === 'UNKNOWN' ? 'Unknown' : meta.label}
          </p>
          <h4 className="status-hero__label">{headline}</h4>
          <p className="status-hero__copy">
            {isSingle && area.status !== 'UNKNOWN' ? (
              <>
                {area.statusExplanation.replace(/\s*Based on a single (recent )?community report\.?/i, '').trim()}{' '}
                Shown as a single community report — unverified.
              </>
            ) : (
              area.statusExplanation
            )}
          </p>
        </div>
      </div>

      <div className="fact-grid">
        <div className="fact">
          <p className="fact__label">Latest update</p>
          <p className="fact__value">
            {area.latestReportAt ? (
              <>
                {timeAgo(area.latestReportAt)}
                <span style={{ color: 'var(--faint)' }}> · {absoluteTime(area.latestReportAt)}</span>
              </>
            ) : (
              'No reports yet'
            )}
          </p>
        </div>
        <div className="fact">
          <p className="fact__label">Freshness</p>
          <p className="fact__value" style={{ color: freshness ? 'var(--label)' : 'var(--subtle)' }}>
            {freshness ? freshness.label : 'Nothing recent'}
            {freshness && (
              <span className="fact__aside">{freshness.copy}</span>
            )}
          </p>
        </div>
        <div className="fact">
          <p className="fact__label">Reports counted</p>
          <p className="fact__value fact__value--serif">
            {area.eligibleReportCount}
            <span className="fact__aside">in {thresholds.agingMinutes} min</span>
          </p>
        </div>
        <div className="fact">
          <p className="fact__label">Agreement</p>
          <p className="fact__value">
            {area.eligibleReportCount === 0
              ? 'Nothing to compare'
              : area.status === 'CONFLICTED'
                ? 'Mixed — ON and OFF'
                : area.supportingCount >= 2
                  ? `${area.supportingCount} matching${
                      area.opposingCount ? `, ${area.opposingCount} opposite` : ''
                    }`
                  : 'Single report'}
          </p>
        </div>
      </div>

      <div className="checker__foot">
        <p className="checker__foot-note">
          Community-reported, unverified.
          {area.staleReportCount > 0
            ? ` ${pluralise(area.staleReportCount, 'older report')} excluded as stale.`
            : ''}
        </p>
        <button type="button" className="btn btn--ghost" onClick={onReport}>
          Report this area
          <Icon name="arrowRight" size={14} />
        </button>
      </div>
    </div>
  );
}

function PromptPanel({ areas, onSelect, onScrollTo }) {
  const suggestions = areas.slice(0, 3);
  return (
    <div className="checker__panel checker__prompt">
      <div className="case__rim" aria-hidden="true" />
      <p className="eyebrow">Start here</p>
      <h3 className="checker__prompt-title">
        Which neighbourhood are you <em className="serif-italic">checking</em>?
      </h3>
      <p className="checker__prompt-copy">
        Search the pilot coverage list. Status is built only from timestamped community
        reports — we never invent an ON or OFF when nobody has reported.
      </p>
      <NeighbourhoodSearch
        areas={areas}
        onSelect={onSelect}
        placeholder="Search your neighbourhood"
      />
      {suggestions.length > 0 && (
        <div className="checker__empty-suggest">
          {suggestions.map((area) => (
            <button
              key={area.id}
              type="button"
              className="suggest-pill"
              onClick={() => onSelect(area)}
            >
              {area.name}
            </button>
          ))}
          <button type="button" className="suggest-pill" onClick={() => onScrollTo('coverage')}>
            All {areas.length} areas
          </button>
        </div>
      )}
    </div>
  );
}

export default function StatusChecker({
  areas,
  detail,
  loading,
  onSelect,
  onReport,
  onRefresh,
  refreshing,
  onScrollTo,
  thresholds,
  error,
}) {
  const revealRef = useRevealOnScroll();
  return (
    <section className="section section--entry" id="status" aria-labelledby="status-heading">
      <div className="shell reveal-on-scroll" ref={revealRef}>
        <div style={{ marginBottom: 40, maxWidth: 720 }}>
          <p className="eyebrow" style={{ marginBottom: 18 }}>
            Live check
          </p>
          <h2 className="chapter" id="status-heading">
            The answer, with its <em className="serif-italic">receipts</em>.
          </h2>
          <p className="lead" style={{ marginTop: 24, maxWidth: '46ch' }}>
            Every status shows who reported it, how many people agree, and how old the
            information is. If nothing recent exists, we say so.
          </p>
        </div>

        <div className="checker">
          <div className="checker__col checker__col--status">
            {error ? (
              <div className="checker__panel" role="alert">
                <div className="case__rim" aria-hidden="true" />
                <div className="alert alert--error" style={{ marginBottom: 0 }}>
                  <Icon name="alert" size={16} />
                  <span>{error}</span>
                </div>
              </div>
            ) : loading && !detail ? (
              <div className="checker__panel" aria-busy="true" aria-live="polite">
                <div className="case__rim" aria-hidden="true" />
                <span className="sr-only">Loading neighbourhood status</span>
                <div className="skeleton" style={{ height: 14, width: '30%', marginBottom: 18 }} />
                <div className="skeleton" style={{ height: 40, width: '62%', marginBottom: 28 }} />
                <div className="skeleton" style={{ height: 88, marginBottom: 20 }} />
                <div className="skeleton" style={{ height: 120 }} />
              </div>
            ) : detail ? (
              <StatusPanel
                key={detail.slug}
                detail={detail}
                onReport={onReport}
                onRefresh={onRefresh}
                refreshing={refreshing}
                thresholds={thresholds}
              />
            ) : (
              <PromptPanel areas={areas} onSelect={onSelect} onScrollTo={onScrollTo} />
            )}
          </div>

          <div className="checker__col checker__col--feed">
            <ReportFeed detail={detail} thresholds={thresholds} />
          </div>
        </div>
      </div>
    </section>
  );
}

function ReportFeed({ detail, thresholds }) {
  const reports = detail?.reports ?? [];
  return (
    <div className="checker__panel">
      <div className="case__rim" aria-hidden="true" />
      <div className="feed__head">
        <p className="feed__title">
          {detail ? `${detail.name} reports` : 'Recent community reports'}
        </p>
        <p className="feed__note">Newest first</p>
      </div>
      {!detail ? (
        <p className="feed__empty">
          Select a neighbourhood to see the individual reports behind its status. Each
          entry is timestamped and labelled as a community report.
        </p>
      ) : reports.length === 0 ? (
        <p className="feed__empty">
          No reports in the past {thresholds?.agingMinutes ?? 120} minutes for this
          area. The status stays UNKNOWN until someone shares an observation — it is never
          assumed to be OFF.
        </p>
      ) : (
        <ul className="feed">
          {reports.slice(0, 20).map((report, index) => {
            const meta = statusMeta(report.status);
            return (
              <li
                className="feed__item fade-in"
                key={report.id}
                style={{ animationDelay: `${Math.min(index, 5) * 55}ms` }}
              >
                <span
                  className={`status-token status-token--${meta.tone}`}
                  style={{ minWidth: 34, paddingTop: 2 }}
                >
                  {report.status === 'ON' ? 'ON' : 'OFF'}
                </span>
                <div className="feed__main">
                  <p className="feed__line">
                    <span className="feed__area">{report.areaName}</span>
                    <span className="feed__verb">
                      {report.status === 'ON' ? 'reported ON' : 'reported OFF'}
                    </span>
                  </p>
                  <p className="feed__meta">
                    <span className="feed__time">{timeAgo(report.createdAt)}</span>
                    <span className="dot" aria-hidden="true" />
                    <span>Community report</span>
                    <span className="dot" aria-hidden="true" />
                    <span>{freshnessMeta(report.freshness)?.label}</span>
                    {report.isDemo && <span className="feed__demo">Demo</span>}
                  </p>
                </div>
                <time className="feed__age" dateTime={report.createdAt}>
                  {absoluteTime(report.createdAt).replace(' WAT', '')}
                </time>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
