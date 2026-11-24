import { Icon } from './icons.jsx';
import NeighbourhoodSearch from './NeighbourhoodSearch.jsx';
import heroImage from '../assets/hero-neighbourhood.webp';
import heroLqip from '../assets/hero-neighbourhood-lqip.webp';

/**
 * Hero visual: an illustration of someone checking LightWatch on their phone,
 * with a small live-report card anchored beside it. The illustration is
 * lazy-loaded and has a blur-up placeholder so it never blocks first paint.
 */
function HeroVisual() {
  return (
    <div className="hero-visual">
      <div className="hero-visual__frame">
        <img
          className="hero-visual__img"
          src={heroImage}
          alt="A woman smiling as she checks her phone on a residential street at dusk, with lit windows and a street lamp behind her."
          width="1000"
          height="1792"
          loading="lazy"
          decoding="async"
          style={{ backgroundImage: `url(${heroLqip})` }}
        />
        <div className="hero-visual__scrim" aria-hidden="true" />
      </div>

      {/* Sample report card — decorative, mirrors the real status card. */}
      <div className="hero-visual__card" aria-hidden="true">
        <span className="hero-visual__card-dot" />
        <span className="hero-visual__card-body">
          <span className="hero-visual__card-status">Power on</span>
          <span className="hero-visual__card-meta">Lekki Phase 1 · 4 min ago</span>
        </span>
      </div>
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
            <button type="button" className="btn btn--light btn--lg" onClick={() => onScrollTo('status')}>
              Check electricity status
              <Icon name="arrowDown" size={15} />
            </button>
            <button type="button" className="btn btn--ghost btn--lg" onClick={onReport}>
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

        <HeroVisual />
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
