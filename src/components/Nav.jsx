import { Icon } from './icons.jsx';

export function Wordmark({ onClick }) {
  return (
    <a href="#top" className="wordmark" onClick={onClick} aria-label="LightWatch home">
      <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeOpacity="0.22" />
        <circle cx="12" cy="12" r="6.6" fill="none" stroke="#ae9357" strokeOpacity="0.65" />
        <circle cx="12" cy="12" r="2.9" fill="#fff0cc" />
      </svg>
      LightWatch
    </a>
  );
}

export default function Nav({ onReport, onHome, onScrollTo, areas = [] }) {
  const reportingNow = areas.filter((area) => area.eligibleReportCount > 0).length;

  return (
    <>
      <div className="announcement">
        <div className="shell announcement__inner">
          <span className="announcement__dot" aria-hidden="true" />
          <p>
            Community-reported updates. <span className="announcement__sep">·</span>{' '}
            <span className="announcement__muted">Not an official utility feed.</span>
          </p>
          <span className="announcement__board" aria-label="Pilot coverage summary">
            <span className="announcement__tick" aria-hidden="true" />
            {areas.length} areas
            <span className="announcement__sep">·</span>
            {reportingNow} reporting now
          </span>
          <button type="button" className="announcement__link" onClick={() => onScrollTo('trust')}>
            How reports work
            <Icon name="arrowRight" size={12} />
          </button>
        </div>
      </div>
      <header className="nav">
        <div className="shell nav__inner">
          <Wordmark onClick={onHome} />
          <nav className="nav__links" aria-label="Primary">
            <button type="button" className="nav__link" onClick={() => onScrollTo('status')}>
              Check status
            </button>
            <button type="button" className="nav__link" onClick={() => onScrollTo('coverage')}>
              Coverage
            </button>
            <button type="button" className="nav__link" onClick={() => onScrollTo('how')}>
              How it works
            </button>
            <button type="button" className="nav__link" onClick={() => onScrollTo('trust')}>
              Transparency
            </button>
          </nav>
          <button type="button" className="nav__action" onClick={onReport}>
            Report electricity
          </button>
        </div>
      </header>
    </>
  );
}
