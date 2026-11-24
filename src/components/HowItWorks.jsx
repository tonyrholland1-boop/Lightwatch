import { useState } from 'react';
import { Icon } from './icons.jsx';

const STEPS = [
  {
    title: 'Find your area',
    copy: 'Search the supported neighbourhoods and pick yours. Coverage is limited to the pilot, so the list is short by design.',
  },
  {
    title: 'Read the latest reports',
    copy: 'See what people nearby have shared, when they shared it, and whether the reports agree with each other.',
  },
  {
    title: 'Add what you observe',
    copy: 'Power on or off — one tap and a confirmation. Your report updates the area status for everyone checking next.',
  },
];

export default function HowItWorks({ onScrollTo, metrics }) {
  return (
    <section className="section" id="how" aria-labelledby="how-heading">
      <div className="shell">
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 40,
            alignItems: 'flex-end',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ maxWidth: 640 }}>
            <p className="eyebrow" style={{ marginBottom: 18 }}>
              How it works
            </p>
            <h2 className="chapter" id="how-heading">
              Three steps, built for a <em className="serif-italic">quick</em> glance.
            </h2>
          </div>
          <p className="lead" style={{ maxWidth: '38ch' }}>
            No sign-up, no app install. LightWatch works on the phone already in your hand.
          </p>
        </div>

        <ol className="steps">
          {STEPS.map((step, index) => (
            <li className="step" key={step.title}>
              <p className="step__num">Step {String(index + 1).padStart(2, '0')}</p>
              <h3 className="step__title">{step.title}</h3>
              <p className="step__copy">{step.copy}</p>
            </li>
          ))}
        </ol>
      </div>

      <Metrics metrics={metrics} />
    </section>
  );
}

export function Metrics({ metrics }) {
  const values = [
    {
      value: metrics?.reports24h ?? '—',
      label: 'Community reports in the last 24 hours',
    },
    {
      value: metrics?.activeAreas ?? '—',
      label: 'Supported neighbourhoods in the pilot',
    },
    {
      value: metrics?.areasWithRecentReports ?? '—',
      label: 'Areas with a report in the last 2 hours',
    },
    {
      value:
        metrics?.medianAgeMinutes === null || metrics?.medianAgeMinutes === undefined
          ? '—'
          : `${metrics.medianAgeMinutes} min`,
      label: 'Median age of today\u2019s reports',
    },
  ];
  return (
    <div className="shell">
      <dl className="metrics">
        {values.map((item) => (
          <div key={item.label}>
            <dt className="metric__label">{item.label}</dt>
            <dd className="metric__value">{item.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

const TRUST_ITEMS = [
  {
    icon: 'users',
    title: 'Community-submitted',
    copy: 'Every report comes from a person in the area. Nothing is imported from a distribution company or presented as official.',
  },
  {
    icon: 'clock',
    title: 'Timestamped, always',
    copy: 'Reports are stamped by our server, then labelled Fresh, Aging or Stale so you know how much weight to give them.',
  },
  {
    icon: 'scale',
    title: 'Disagreement surfaced',
    copy: 'When reports conflict, the area shows CONFLICTED. We don\u2019t average disagreements into a confident answer.',
  },
  {
    icon: 'eyeOff',
    title: 'Private by design',
    copy: 'No names, phone numbers or GPS. We use a short-lived, hashed request fingerprint only to rate-limit abuse.',
  },
];

const LEGEND = [
  {
    term: 'ON',
    copy: 'Recent qualifying reports say electricity is available.',
  },
  {
    term: 'OFF',
    copy: 'Recent qualifying reports say electricity is unavailable.',
  },
  {
    term: 'Unknown',
    copy: 'Too few recent reports to say anything. Absence of reports is never treated as OFF.',
  },
  {
    term: 'Conflicted',
    copy: 'Recent reports point in opposite directions, and no clear majority has formed.',
  },
  {
    term: 'Fresh',
    copy: 'Submitted within the last 30 minutes. Most useful for a decision right now.',
  },
  {
    term: 'Aging',
    copy: 'Between 30 and 120 minutes old. Still counts, but treat it with caution.',
  },
  {
    term: 'Stale',
    copy: 'Older than 120 minutes. Excluded from status entirely.',
  },
];

export function Trust({ onScrollTo }) {
  return (
    <section className="section" id="trust" aria-labelledby="trust-heading">
      <div className="shell">
        <div style={{ maxWidth: 760, marginBottom: 48 }}>
          <p className="eyebrow" style={{ marginBottom: 18 }}>
            Transparency
          </p>
          <h2 className="chapter" id="trust-heading">
            No certainty we haven&rsquo;t <em className="serif-italic">earned</em>.
          </h2>
          <p className="lead" style={{ marginTop: 24, maxWidth: '56ch' }}>
            LightWatch is not a utility feed. It&rsquo;s a shared, timestamped view of what
            people nearby are seeing — and it says so everywhere it can.
          </p>
        </div>

        <div className="trust">
          {TRUST_ITEMS.map((item) => (
            <article className="trust__item" key={item.title}>
              <div className="case__rim" aria-hidden="true" />
              <span className="trust__icon">
                <Icon name={item.icon} size={15} />
              </span>
              <h3 className="trust__title">{item.title}</h3>
              <p className="trust__copy">{item.copy}</p>
            </article>
          ))}
        </div>

        <div className="trust__split">
          <div>
            <h3 className="heading-small" style={{ maxWidth: '18ch' }}>
              What each label actually means
            </h3>
            <p className="caption-muted" style={{ marginTop: 18, maxWidth: '40ch', lineHeight: 1.6 }}>
              Status combines the latest qualifying reports. Freshness is measured from the
              server timestamp, so a slow connection never makes old news look new.
            </p>
            <button
              type="button"
              className="btn btn--ghost"
              style={{ marginTop: 24 }}
              onClick={() => onScrollTo('faq')}
            >
              Read the full explanation
              <Icon name="arrowDown" size={14} />
            </button>
          </div>
          <dl className="legend">
            {LEGEND.map((entry) => (
              <div className="legend__row" key={entry.term}>
                <dt>{entry.term}</dt>
                <dd>{entry.copy}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
