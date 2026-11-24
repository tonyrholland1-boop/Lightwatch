import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Nav from './components/Nav.jsx';
import Hero from './components/Hero.jsx';
import StatusChecker from './components/StatusChecker.jsx';
import Coverage from './components/Coverage.jsx';
import ReportBuilder from './components/ReportBuilder.jsx';
import HowItWorks, { Trust } from './components/HowItWorks.jsx';
import { Icon } from './components/icons.jsx';
import { Faq, Footer, Quote, SuccessDialog, WarmConversion } from './components/ClosingSections.jsx';
import { api, ApiError } from './lib/api.js';
import { statusMeta, timeAgo } from './lib/format.js';

const FALLBACK_THRESHOLDS = {
  freshMinutes: 30,
  agingMinutes: 120,
  agreementWindowMinutes: 30,
  agreementMinReports: 2,
  duplicateCooldownMinutes: 10,
  rateLimits: { perArea: 3, perAreaWindowMinutes: 30, daily: 10 },
};

function scrollToId(id) {
  const element = document.getElementById(id);
  if (!element) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  element.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
}

function readSlugFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('area') || '';
}

export default function App() {
  const [overview, setOverview] = useState(null);
  const [overviewError, setOverviewError] = useState('');
  const [selectedSlug, setSelectedSlug] = useState(readSlugFromUrl);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [recentReports, setRecentReports] = useState([]);
  const [tick, setTick] = useState(0);
  const [toast, setToast] = useState(null);
  const [lastSubmission, setLastSubmission] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const detailRequest = useRef(0);

  const areas = overview?.neighbourhoods ?? [];
  const thresholds = overview?.thresholds ?? FALLBACK_THRESHOLDS;
  const metrics = overview?.metrics ?? null;

  const selectedArea = useMemo(
    () => areas.find((area) => area.slug === selectedSlug) ?? null,
    [areas, selectedSlug],
  );

  /* ---------- Data loading ---------- */
  const loadOverview = useCallback(async ({ quiet = false } = {}) => {
    try {
      const payload = await api.overview();
      setOverview(payload);
      setOverviewError('');
      return payload;
    } catch (error) {
      if (!quiet) {
        setOverviewError(
          error?.message || "We couldn't load coverage right now. Check your connection.",
        );
      }
      return null;
    }
  }, []);

  const loadDetail = useCallback(async (slug, { quiet = false } = {}) => {
    if (!slug) {
      setDetail(null);
      return null;
    }
    const requestId = ++detailRequest.current;
    if (!quiet) {
      setDetailLoading(true);
      setDetailError('');
    }
    try {
      const payload = await api.neighbourhood(slug);
      if (requestId !== detailRequest.current) return null;
      setDetail(payload);
      setDetailError('');
      return payload;
    } catch (error) {
      if (requestId !== detailRequest.current) return null;
      if (error instanceof ApiError && (error.status === 404 || error.status === 410)) {
        setDetail(null);
        setDetailError(error.message);
        setSelectedSlug('');
        const url = new URL(window.location.href);
        url.searchParams.delete('area');
        window.history.replaceState({}, '', url);
      } else {
        setDetailError(error?.message || "We couldn't load this neighbourhood.");
      }
      return null;
    } finally {
      if (requestId === detailRequest.current) setDetailLoading(false);
    }
  }, []);

  const loadRecent = useCallback(async () => {
    try {
      const payload = await api.recentReports(6);
      setRecentReports(payload.reports ?? []);
    } catch {
      /* Feed is supplementary; keep the page usable. */
    }
  }, []);

  useEffect(() => {
    loadOverview();
    loadRecent();
  }, [loadOverview, loadRecent]);

  useEffect(() => {
    if (selectedSlug) loadDetail(selectedSlug);
    else setDetail(null);
  }, [selectedSlug, loadDetail]);

  /* Keep relative timestamps honest without refetching. */
  useEffect(() => {
    const interval = setInterval(() => setTick((value) => value + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  /* Periodic quiet refresh of the selected area every 90 seconds. */
  useEffect(() => {
    if (!selectedSlug) return undefined;
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        loadDetail(selectedSlug, { quiet: true });
        loadOverview({ quiet: true });
      }
    }, 90000);
    return () => clearInterval(interval);
  }, [selectedSlug, loadDetail, loadOverview]);

  /* Dismiss toast */
  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 5200);
    return () => clearTimeout(timer);
  }, [toast]);

  /* ---------- Actions ---------- */
  const selectArea = useCallback(
    (area) => {
      if (!area) return;
      setSelectedSlug(area.slug);
      const url = new URL(window.location.href);
      url.searchParams.set('area', area.slug);
      window.history.replaceState({}, '', url);
      const meta = statusMeta(area.status);
      setToast({
        tone: 'info',
        message: `${area.name} selected · ${meta.short.toLowerCase()}${
          area.latestReportAt ? ` ${timeAgo(area.latestReportAt)}` : ''
        }`,
      });
      window.setTimeout(() => scrollToId('status'), 60);
    },
    [],
  );

  const submitReport = useCallback(
    async (payload) => {
      try {
        const result = await api.submitReport(payload);
        setLastSubmission({ report: result.report, areaName: result.neighbourhood.name });
        setDialogOpen(true);
        setToast({ tone: 'success', message: result.message });
        await Promise.all([
          loadOverview({ quiet: true }),
          loadDetail(result.neighbourhood.slug, { quiet: true }),
          loadRecent(),
        ]);
        return result;
      } catch (error) {
        throw error instanceof ApiError
          ? error
          : new ApiError("We couldn't submit your report. Check your connection and try again.");
      }
    },
    [loadOverview, loadDetail, loadRecent],
  );

  const refreshSelected = useCallback(async () => {
    if (!selectedSlug) return;
    setRefreshing(true);
    await Promise.all([loadDetail(selectedSlug, { quiet: true }), loadOverview({ quiet: true })]);
    setRefreshing(false);
    setToast({ tone: 'info', message: 'Status refreshed.' });
  }, [selectedSlug, loadDetail, loadOverview]);

  const goReport = useCallback(() => scrollToId('report'), []);

  /* `tick` re-renders relative timestamps every 30s without refetching. */
  void tick;
  /* The API returns { neighbourhood, reports }; flatten for the status panel
     while keeping the reports attached for the feed. */
  const checkerDetail = detail
    ? { ...detail.neighbourhood, reports: detail.reports }
    : null;

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      <Nav
        areas={areas}
        onReport={goReport}
        onHome={() => scrollToId('top')}
        onScrollTo={scrollToId}
      />

      <main id="main">
        <Hero
          areas={areas}
          onSelect={selectArea}
          onReport={goReport}
          onScrollTo={scrollToId}
          metrics={metrics}
          thresholds={thresholds}
        />

        <StatusChecker
          areas={areas}
          detail={checkerDetail}
          loading={detailLoading}
          error={detailError || overviewError}
          onSelect={selectArea}
          onReport={goReport}
          onRefresh={refreshSelected}
          refreshing={refreshing}
          onScrollTo={scrollToId}
          thresholds={thresholds}
        />

        <Coverage
          areas={areas}
          selectedSlug={selectedSlug}
          onSelect={selectArea}
          onScrollTo={scrollToId}
          loading={!overview && !overviewError}
        />

        <ReportBuilder
          areas={areas}
          selectedArea={selectedArea}
          recentReports={recentReports}
          onSubmit={submitReport}
          thresholds={thresholds}
          onSelect={selectArea}
        />

        <HowItWorks />
        <Quote />
        <Trust onScrollTo={scrollToId} />
        <WarmConversion onReport={goReport} onScrollTo={scrollToId} />
        <Faq contactEmail="feedback@lightwatch.ng" />
      </main>

      <Footer onScrollTo={scrollToId} onReport={goReport} contactEmail="feedback@lightwatch.ng" />

      <SuccessDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        report={lastSubmission?.report}
        areaName={lastSubmission?.areaName}
      />

      {toast && (
        <div className={`toast toast--${toast.tone}`} role="status" aria-live="polite">
          {toast.tone === 'success' ? (
            <Icon name="check" size={15} />
          ) : toast.tone === 'error' ? (
            <Icon name="alert" size={15} />
          ) : (
            <Icon name="info" size={15} />
          )}
          <span>{toast.message}</span>
        </div>
      )}
    </>
  );
}
