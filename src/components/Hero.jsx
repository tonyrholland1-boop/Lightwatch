import { Icon } from './icons.jsx';
import NeighbourhoodSearch from './NeighbourhoodSearch.jsx';

function HeroScene() {
  return (
    <div className="scene" aria-hidden="true">
      <div className="scene__beam scene__beam--a" />
      <div className="scene__beam scene__beam--b" />
      <div className="scene__glow" />
      <div className="scene__slab" />
      <div className="scene__card">
        <div className="scene__panel">
          <div className="scene__panel-orb" />
          <div className="scene__panel-line" style={{ top: '16%', width: '42%' }} />
          <div className="scene__panel-line" style={{ top: '22%', width: '26%', opacity: 0.5 }} />
          <div className="scene__panel-line" style={{ top: '58%', width: '58%', opacity: 0.34 }} />
          <div className="scene__panel-line" style={{ top: '63%', width: '44%', opacity: 0.22 }} />
          <div className="scene__panel-chip" />
        </div>
      </div>
      <div className="scene__chit">
        <span className="scene__chit-dot" />
        <span>
          Reported ON
          <small>4 min ago · Lekki Phase 1</small>
        </span>
      </div>
      <div
        className="scene__chit"
        style={{ right: '30%', bottom: '19%', transform: 'rotate(4deg)', opacity: 0.82 }}
      >
        <span className="scene__chit-dot scene__chit-dot--amber" />
        <span>
          Reports disagree
          <small>12 min ago · Yaba</small>
        </span>
      </div>
      <div className="scene__vignette" />
    </div>
  );
}

export default function Hero({
  areas,
  onSelect,
  onReport,
  onScrollTo,
  metrics,
  thresholds,
}) {
  const reportingNow = metrics?.reportingNow ?? 0;
  const supportCount = areas?.length ?? 0;

  return (
    <section className="hero" id="top">
      <div className="hero__stage">
        <HeroScene />
      </div>

      <div className="shell hero__inner">
        <div className="hero__copy">
          <p className="badge reveal">
            <span className="badge__dot" aria-hidden="true" />
            Lagos &amp; Abuja pilot · {supportCount} neighbourhoods
          </p>

          <h1 className="display hero__title reveal reveal--2">
            Know where there&rsquo;s <em className="serif-italic">light</em>.
            <br />
            Before you go looking.
          </h1>

          <p className="hero__support reveal reveal--3">
            See recent electricity updates around your neighbourhood, shared by people
            nearby.
          </p>

          <div className="search--hero reveal reveal--3" style={{ width: '100%' }}>
            <NeighbourhoodSearch areas={areas} onSelect={onSelect} variant="hero" />
          </div>

          <div className="hero__actions reveal reveal--4">
            <button type="button" className="btn btn--light" onClick={() => onScrollTo('status')}>
              Check electricity status
              <Icon name="arrowDown" size={15} />
            </button>
            <button type="button" className="btn btn--ghost" onClick={onReport}>
              Report electricity
            </button>
          </div>

          <div className="hero__proof reveal reveal--4">
            <span>Community-reported</span>
            <span className="hero__proof-sep" aria-hidden="true" />
            <span>Timestamps on every update</span>
            <span className="hero__proof-sep" aria-hidden="true" />
            <span>No account needed</span>
          </div>
        </div>
      </div>

      <div className="shell">
        <div className="hero__footer">
          <div className="hero__proof" style={{ paddingTop: 0, justifyContent: 'space-between' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <Icon name="pin" size={13} />
              Supported now: Lagos · Abuja (FCT)
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <Icon name="waves" size={13} />
              {reportingNow > 0
                ? `${reportingNow} ${reportingNow === 1 ? 'area has' : 'areas have'} recent reports`
                : 'Be the first to report in your area'}
              {thresholds ? ` · fresh within ${thresholds.freshMinutes} min` : ''}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
