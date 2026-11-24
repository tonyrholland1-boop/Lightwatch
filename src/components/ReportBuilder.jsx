import { useEffect, useRef, useState } from 'react';
import { Icon } from './icons.jsx';
import { statusMeta, timeAgo } from '../lib/format.js';
import { useRevealOnScroll } from '../lib/useMotion.js';

const emptyForm = { neighbourhoodId: '', status: '', acknowledged: false };

export default function ReportBuilder({
  areas,
  selectedArea,
  recentReports,
  onSubmit,
  thresholds,
  onSelect,
}) {
  const [form, setForm] = useState(emptyForm);
  const [state, setState] = useState({ status: 'idle', message: '', tone: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const resultRef = useRef(null);
  const revealRef = useRevealOnScroll();
  const submitting = state.status === 'submitting';

  useEffect(() => {
    if (selectedArea) {
      setForm((current) =>
        current.neighbourhoodId === selectedArea.id
          ? current
          : { ...current, neighbourhoodId: selectedArea.id },
      );
    }
  }, [selectedArea]);

  useEffect(() => {
    if (state.status === 'success' || state.status === 'error') {
      resultRef.current?.focus?.();
    }
  }, [state.status]);

  const chosenArea = areas.find((area) => area.id === form.neighbourhoodId);

  const validate = () => {
    const errors = {};
    if (!form.neighbourhoodId) errors.neighbourhoodId = 'Select a supported neighbourhood.';
    if (form.status !== 'ON' && form.status !== 'OFF') errors.status = 'Choose ON or OFF.';
    if (!form.acknowledged) errors.acknowledged = 'Confirm this is your own observation.';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;
    if (!validate()) {
      setState({
        status: 'error',
        tone: 'error',
        message: 'Check the highlighted fields before sending your report.',
      });
      return;
    }
    setState({ status: 'submitting', tone: '', message: '' });
    try {
      const result = await onSubmit({
        neighbourhoodId: form.neighbourhoodId,
        status: form.status,
        observationAcknowledged: true,
      });
      setState({
        status: 'success',
        tone: 'success',
        message: result.message || 'Thanks for sharing an update.',
      });
      setForm({ neighbourhoodId: form.neighbourhoodId, status: '', acknowledged: false });
      setFieldErrors({});
    } catch (error) {
      const message =
        error?.message ||
        "We couldn't submit your report. Check your connection and try again.";
      setState({ status: 'error', tone: 'error', message });
      if (error?.code === 'unsupported_neighbourhood' || error?.code === 'inactive_neighbourhood') {
        setFieldErrors({ neighbourhoodId: message });
      }
    }
  };

  return (
    <section className="section" id="report" aria-labelledby="report-heading">
      <div className="shell reveal-on-scroll" ref={revealRef}>
        <div style={{ maxWidth: 700, marginBottom: 40 }}>
          <p className="eyebrow" style={{ marginBottom: 18 }}>
            Contribute
          </p>
          <h2 className="chapter" id="report-heading">
            Make what you see <em className="serif-italic">useful</em> to others.
          </h2>
          <p className="lead" style={{ marginTop: 24, maxWidth: '48ch' }}>
            Reporting takes a few seconds. No account, no name, no location tracking — just
            the area and what you&rsquo;re observing right now.
          </p>
        </div>

        <div className="builder">
          <aside className="checker__panel" aria-label="Reporting guidance">
            <div className="case__rim" aria-hidden="true" />
            <p className="eyebrow">Before you report</p>
            <ul className="guidance">
              <li>
                <span className="guidance__num">01</span>
                <p>
                  <strong>Report only what you see.</strong> If you&rsquo;re in the
                  neighbourhood, say whether power is on right now.
                </p>
              </li>
              <li>
                <span className="guidance__num">02</span>
                <p>
                  <strong>One report per change.</strong> Reports are rate-limited and a
                  repeat within {thresholds.duplicateCooldownMinutes} minutes is rejected.
                </p>
              </li>
              <li>
                <span className="guidance__num">03</span>
                <p>
                  <strong>Disagreement is data.</strong> If others report differently, the
                  status becomes CONFLICTED rather than picking a winner.
                </p>
              </li>
            </ul>

            <div className="guidance__recent">
              <p className="feed__title" style={{ fontSize: 15 }}>
                Just reported
              </p>
              {recentReports.length === 0 ? (
                <p className="feed__empty" style={{ padding: '12px 0 0' }}>
                  Nothing in the last few hours. Your report could be the first today.
                </p>
              ) : (
                <ul className="mini-feed">
                  {recentReports.slice(0, 3).map((report) => (
                    <li key={report.id}>
                      <span className={`mini-feed__status mini-feed__status--${report.status.toLowerCase()}`}>
                        {report.status}
                      </span>
                      <span className="mini-feed__area">{report.areaName}</span>
                      <span className="mini-feed__time">{timeAgo(report.createdAt)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>

          <div className="builder__form">
            <div className="case__rim" aria-hidden="true" />
            <form onSubmit={handleSubmit} noValidate aria-busy={submitting}>
              {state.message && (
                <div
                  ref={resultRef}
                  tabIndex={-1}
                  role={state.status === 'error' ? 'alert' : 'status'}
                  className={`alert alert--${state.status === 'error' ? 'error' : 'success'}`}
                >
                  <Icon name={state.status === 'error' ? 'alert' : 'check'} size={16} />
                  <span>
                    <strong>
                      {state.status === 'error' ? 'Report not sent. ' : 'Report received. '}
                    </strong>
                    {state.message}
                    {state.status === 'success' && chosenArea && (
                      <span className="alert__detail">
                        {chosenArea.name} is now updated for everyone checking next.
                      </span>
                    )}
                  </span>
                </div>
              )}

              <div className="field">
                <label className="field__label" htmlFor="report-area">
                  <span>Neighbourhood</span>
                  {chosenArea && (
                    <span className="field__hint">
                      {chosenArea.city}, {chosenArea.state}
                    </span>
                  )}
                </label>
                <div className="select-shell">
                  <select
                    id="report-area"
                    value={form.neighbourhoodId}
                    aria-invalid={Boolean(fieldErrors.neighbourhoodId)}
                    aria-describedby={fieldErrors.neighbourhoodId ? 'report-area-error' : undefined}
                    onChange={(event) => {
                      setForm((current) => ({ ...current, neighbourhoodId: event.target.value }));
                      setFieldErrors((current) => ({ ...current, neighbourhoodId: undefined }));
                    }}
                  >
                    <option value="">Select a supported neighbourhood</option>
                    {areas.map((area) => (
                      <option key={area.id} value={area.id}>
                        {area.name} — {area.city}, {area.state}
                      </option>
                    ))}
                  </select>
                  <Icon name="chevronDown" size={16} />
                </div>
                {fieldErrors.neighbourhoodId && (
                  <p className="field__error" id="report-area-error">
                    {fieldErrors.neighbourhoodId}
                  </p>
                )}
              </div>

              <fieldset className="field" style={{ border: 0, padding: 0, margin: '0 0 22px' }}>
                <legend className="field__label" style={{ width: '100%' }}>
                  <span>Electricity right now</span>
                  <span className="field__hint">Your observation</span>
                </legend>
                <div className="status-choice" role="radiogroup" aria-label="Electricity status">
                  {[
                    {
                      value: 'ON',
                      copy: 'Power is available where I am.',
                    },
                    {
                      value: 'OFF',
                      copy: 'Power is not available where I am.',
                    },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      role="radio"
                      aria-checked={form.status === option.value}
                      data-status={option.value}
                      className="status-option"
                      onClick={() => {
                        setForm((current) => ({ ...current, status: option.value }));
                        setFieldErrors((current) => ({ ...current, status: undefined }));
                      }}
                    >
                      <span className="status-option__row">
                        <span className="status-option__label">{option.value}</span>
                        <span className="status-option__check" aria-hidden="true">
                          {form.status === option.value && <Icon name="check" size={10} />}
                        </span>
                      </span>
                      <span className="status-option__copy">{option.copy}</span>
                    </button>
                  ))}
                </div>
                {fieldErrors.status && <p className="field__error">{fieldErrors.status}</p>}
              </fieldset>

              <label className="checkline">
                <input
                  type="checkbox"
                  checked={form.acknowledged}
                  onChange={(event) => {
                    setForm((current) => ({ ...current, acknowledged: event.target.checked }));
                    setFieldErrors((current) => ({ ...current, acknowledged: undefined }));
                  }}
                  aria-invalid={Boolean(fieldErrors.acknowledged)}
                />
                <span>
                  I confirm this is my own observation of the area right now, and I
                  understand reports are community-submitted and unverified.
                </span>
              </label>
              {fieldErrors.acknowledged && (
                <p className="field__error" style={{ marginTop: -14, marginBottom: 18 }}>
                  {fieldErrors.acknowledged}
                </p>
              )}

              <button
                type="submit"
                className="btn btn--light btn--lg builder__submit"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <span className="spinner" aria-hidden="true" />
                    Sending report…
                  </>
                ) : (
                  <>
                    Submit community report
                    <Icon name="arrowRight" size={15} />
                  </>
                )}
              </button>
              <p className="builder__note">
                Timestamped by our server, never your device. No names or contact details
                are collected. Reports older than {thresholds.agingMinutes} minutes stop
                counting toward status.
              </p>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
