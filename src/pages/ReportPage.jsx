import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';

// ─── Static config ────────────────────────────────────────────────────────────

const OVERALL_CONFIG = {
  'ready':           { label: 'Release Ready',    color: 'var(--color-pass)',     bg: 'var(--color-pass-bg)',     border: '#bbf7d0' },
  'needs-attention': { label: 'Needs Attention',  color: '#d97706',               bg: 'var(--color-medium-bg)',   border: 'var(--color-medium-border)' },
  'not-ready':       { label: 'Action Required',  color: 'var(--color-critical)', bg: 'var(--color-critical-bg)', border: 'var(--color-critical-border)' },
};

const CAT_STATUS_CONFIG = {
  pass: { label: 'Passed',   cls: 'badge-pass',     Icon: IconCheck },
  warn: { label: 'Warning',  cls: 'badge-warn',     Icon: IconWarn  },
  fail: { label: 'Critical', cls: 'badge-critical', Icon: IconFail  },
};

/**
 * Readiness formula (same weights used in DashboardPage):
 *   100 - (critical×20 + high×10 + medium×4 + low×1)
 * Clamped to [0, 100].
 */
function computeReadiness(scoreSummary) {
  const { critical = 0, high = 0, medium = 0, low = 0 } = scoreSummary;
  const penalty = critical * 20 + high * 10 + medium * 4 + low * 1;
  return Math.max(0, Math.min(100, 100 - penalty));
}

function getReadinessInfo(score) {
  if (score >= 80) return { label: 'Release Ready',   color: 'var(--color-pass)',     ring: '#16a34a' };
  if (score >= 50) return { label: 'Needs Attention', color: '#d97706',               ring: '#d97706' };
  return                   { label: 'Action Required',color: 'var(--color-critical)', ring: '#dc2626' };
}

// ─── SVG icons ────────────────────────────────────────────────────────────────

function IconCheck({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="2,7 5.5,11 12,3" />
    </svg>
  );
}
function IconWarn({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 1L13 12H1L7 1z" />
      <line x1="7" y1="5.5" x2="7" y2="8" />
      <circle cx="7" cy="10" r="0.6" fill="currentColor" />
    </svg>
  );
}
function IconFail({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7" cy="7" r="6" />
      <line x1="4.5" y1="4.5" x2="9.5" y2="9.5" />
      <line x1="9.5" y1="4.5" x2="4.5" y2="9.5" />
    </svg>
  );
}
function IconRefresh({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v4H8" /><path d="M2 7a5 5 0 0 1 9.4-2.4L12 6" />
      <path d="M2 12v-4h4" /><path d="M12 7a5 5 0 0 1-9.4 2.4L2 8" />
    </svg>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMs(ms) {
  if (!ms) return '—';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function formatDate(epoch) {
  if (!epoch) return '—';
  return new Date(epoch).toLocaleString(undefined, {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function ReadinessGauge({ score, info }) {
  const circumference = 2 * Math.PI * 44;
  const offset = circumference - (score / 100) * circumference;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <svg width={110} height={110} viewBox="0 0 110 110">
        <circle cx="55" cy="55" r="44" fill="none" stroke="var(--color-border)" strokeWidth="9" />
        <circle
          cx="55" cy="55" r="44" fill="none"
          stroke={info.ring} strokeWidth="9"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 55 55)"
          style={{ transition: 'stroke-dashoffset 0.7s ease' }}
        />
        <text x="55" y="60" textAnchor="middle" fontSize="26" fontWeight="800"
          fill={info.color} fontFamily="'Cascadia Code','Fira Code',Consolas,monospace">
          {score}
        </text>
      </svg>
      <span style={{ fontSize: 12, fontWeight: 700, color: info.color, letterSpacing: '0.03em', textAlign: 'center' }}>
        {info.label}
      </span>
    </div>
  );
}

function StatCell({ label, value, color, sublabel }) {
  return (
    <div style={{
      textAlign: 'center', padding: '14px 8px',
      background: 'var(--color-surface)', borderRadius: 'var(--radius)',
    }}>
      <div style={{ fontSize: 28, fontWeight: 800, fontFamily: 'var(--font-mono)', color: color || 'var(--color-text)', lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>{label}</div>
      {sublabel && <div style={{ fontSize: 10, color: 'var(--color-text-subtle)', marginTop: 2 }}>{sublabel}</div>}
    </div>
  );
}

// ─── Loading / error states ───────────────────────────────────────────────────

function LoadingState() {
  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: 'var(--space-8) var(--space-6)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--color-text-muted)', fontSize: 14 }}>
        <span className="spinner" />
        Loading release readiness report…
      </div>
    </div>
  );
}

function ErrorState({ error, onBack }) {
  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: 'var(--space-8) var(--space-6)' }}>
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: 12,
        padding: '14px 16px',
        background: 'var(--color-medium-bg)', border: '1px solid var(--color-medium-border)',
        borderRadius: 'var(--radius-lg)', marginBottom: 16,
      }}>
        <IconWarn size={16} />
        <div>
          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--color-medium)' }}>Report unavailable</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>{error}</div>
        </div>
      </div>
      <button className="btn-secondary" onClick={onBack} style={{ fontSize: 13 }}>← Back</button>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function ReportPage({ sessionId }) {
  const navigate = useNavigate();
  const [report, setReport]       = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [reanalyzing, setReanalyzing] = useState(false);

  useEffect(() => {
    api.getReport(sessionId)
      .then(data => {
        if (data.status) {
          setError('Analysis not yet complete. Status: ' + data.status);
        } else {
          setReport(data);
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [sessionId]);

  async function handleReanalyze() {
    setReanalyzing(true);
    try {
      const { sessionId: newId } = await api.reanalyze(sessionId);
      navigate(`/analysis/${newId}`);
    } catch (err) {
      alert('Re-analysis failed: ' + err.message);
      setReanalyzing(false);
    }
  }

  if (loading) return <LoadingState />;
  if (error)   return <ErrorState error={error} onBack={() => navigate(-1)} />;

  const { scoreSummary, categoryResults, beforeAfter, workflowTimeline } = report;
  const overallCfg  = OVERALL_CONFIG[report.overallStatus] || OVERALL_CONFIG['needs-attention'];
  const readiness   = computeReadiness(scoreSummary);
  const readinessInfo = getReadinessInfo(readiness);

  // Derived stats
  const totalChecks  = categoryResults?.length ?? 0;
  const passedChecks = (categoryResults || []).filter(c => c.status === 'pass').length;
  const warnChecks   = (categoryResults || []).filter(c => c.status === 'warn').length;
  const failChecks   = (categoryResults || []).filter(c => c.status === 'fail').length;

  return (
    <div style={{ maxWidth: 'var(--content-max)', margin: '0 auto', padding: 'var(--space-8) var(--space-6)' }}>

      {/* ── Page header ── */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        marginBottom: 28, flexWrap: 'wrap', gap: 12,
      }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 4 }}>
            Release Readiness Report
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>
            Run #{report.runNumber} · Generated {formatDate(report.generatedAt)}
          </p>
        </div>
        <button
          className="btn-ghost"
          onClick={handleReanalyze}
          disabled={reanalyzing}
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}
        >
          {reanalyzing ? (
            <><span className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} /> Starting…</>
          ) : (
            <><IconRefresh size={13} /> Re-Run Analysis</>
          )}
        </button>
      </div>

      {/* ── Hero: gauge + status banner ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap',
        marginBottom: 28, padding: '20px 24px',
        background: overallCfg.bg, border: `1px solid ${overallCfg.border}`,
        borderRadius: 'var(--radius-lg)',
      }}>
        {/* Gauge */}
        <ReadinessGauge score={readiness} info={readinessInfo} />

        {/* Status text */}
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <div style={{ color: overallCfg.color }}>
              {report.overallStatus === 'ready'           ? <IconCheck size={20} /> :
               report.overallStatus === 'needs-attention' ? <IconWarn  size={20} /> :
                                                            <IconFail   size={20} />}
            </div>
            <span style={{ fontWeight: 800, fontSize: 18, color: overallCfg.color }}>
              {overallCfg.label}
            </span>
          </div>

          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 10, lineHeight: 1.5 }}>
            {scoreSummary.total === 0
              ? 'No open findings detected. The project is ready to release.'
              : <>
                  {scoreSummary.total} open finding{scoreSummary.total !== 1 ? 's' : ''}
                  {scoreSummary.critical > 0 && <> · <strong style={{ color: 'var(--color-critical)' }}>{scoreSummary.critical} critical</strong></>}
                  {scoreSummary.high > 0 && <> · <strong style={{ color: 'var(--color-high)' }}>{scoreSummary.high} high</strong></>}
                  {scoreSummary.medium > 0 && <> · {scoreSummary.medium} medium</>}
                  {scoreSummary.low > 0 && <> · {scoreSummary.low} low</>}
                  {scoreSummary.fixed > 0 && <> · <span style={{ color: 'var(--color-pass)' }}>{scoreSummary.fixed} fixed</span></>}
                </>
            }
          </p>

          {/* Formula explanation */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: 11, color: 'var(--color-text-subtle)',
            background: 'rgba(0,0,0,0.04)', borderRadius: 4,
            padding: '4px 8px', fontFamily: 'var(--font-mono)',
          }}>
            Score = 100 − (critical×20 + high×10 + medium×4 + low×1)
          </div>
        </div>
      </div>

      {/* ── 4-stat summary row ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
        gap: 10, marginBottom: 28,
      }}>
        <StatCell label="Checks run"   value={totalChecks}  color="var(--color-text)" />
        <StatCell label="Passed"       value={passedChecks} color="var(--color-pass)" />
        <StatCell label="Warnings"     value={warnChecks}   color="var(--color-medium)" />
        <StatCell label="Critical fail" value={failChecks}  color="var(--color-critical)" />
        <StatCell
          label="Open findings" value={scoreSummary.total}
          color={scoreSummary.total === 0 ? 'var(--color-pass)' : 'var(--color-high)'}
        />
        {scoreSummary.fixed > 0 && (
          <StatCell label="Fixed" value={scoreSummary.fixed} color="var(--color-pass)" sublabel="this run" />
        )}
      </div>

      {/* ── Two-column: score breakdown + category results ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: 20, marginBottom: 28,
      }}>

        {/* Score breakdown */}
        <div className="card">
          <h2 style={{ fontWeight: 700, fontSize: 14, marginBottom: 16 }}>Finding Breakdown</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <tbody>
              {[
                { label: 'Critical',   key: 'critical', cls: 'badge-critical', weight: '×20 penalty' },
                { label: 'High',       key: 'high',     cls: 'badge-high',     weight: '×10 penalty' },
                { label: 'Medium',     key: 'medium',   cls: 'badge-medium',   weight: '×4 penalty'  },
                { label: 'Low',        key: 'low',      cls: 'badge-low',      weight: '×1 penalty'  },
                { label: 'Info',       key: 'info',     cls: 'badge-info',     weight: 'no penalty'  },
                { label: 'Fixed',      key: 'fixed',    cls: 'badge-fixed',    weight: null          },
                { label: 'Total open', key: 'total',    cls: null,             weight: null          },
              ].map(({ label, key, cls, weight }) => (
                <tr key={key} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '7px 0', color: 'var(--color-text-muted)', width: '40%' }}>{label}</td>
                  <td style={{ padding: '7px 0', textAlign: 'center' }}>
                    {cls
                      ? <span className={`badge ${cls}`}>{scoreSummary[key] ?? 0}</span>
                      : <strong style={{ fontFamily: 'var(--font-mono)' }}>{scoreSummary[key] ?? 0}</strong>
                    }
                  </td>
                  <td style={{ padding: '7px 0', textAlign: 'right', fontSize: 11, color: 'var(--color-text-subtle)', fontFamily: 'var(--font-mono)' }}>
                    {weight}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Category results */}
        <div className="card">
          <h2 style={{ fontWeight: 700, fontSize: 14, marginBottom: 16 }}>Category Results</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {(categoryResults || []).map(cat => {
              const cfg = CAT_STATUS_CONFIG[cat.status] || CAT_STATUS_CONFIG.warn;
              const CatIcon = cfg.Icon;
              return (
                <div key={cat.category} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 0',
                  borderBottom: '1px solid var(--color-border)',
                }}>
                  <span className={`badge ${cfg.cls}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, minWidth: 76 }}>
                    <CatIcon size={10} />{cfg.label}
                  </span>
                  <span style={{ fontWeight: 600, flex: 1, fontSize: 13 }}>{cat.label}</span>
                  <span style={{ fontSize: 11, color: 'var(--color-text-subtle)', fontFamily: 'var(--font-mono)' }}>
                    {cat.findingCount} issue{cat.findingCount !== 1 ? 's' : ''}
                  </span>
                </div>
              );
            })}
          </div>
          {/* Category summary text */}
          <div style={{ marginTop: 12, padding: '8px 10px', background: 'var(--color-surface)', borderRadius: 'var(--radius)', fontSize: 11, color: 'var(--color-text-subtle)', lineHeight: 1.5 }}>
            {passedChecks === totalChecks
              ? 'All categories passed.'
              : `${passedChecks} of ${totalChecks} categories passed · ${failChecks} critical · ${warnChecks} with warnings`}
          </div>
        </div>
      </div>

      {/* ── Before / After (re-analysis only) ── */}
      {beforeAfter && (
        <div className="card" style={{ marginBottom: 28 }}>
          <h2 style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
            Before vs After  <span style={{ fontWeight: 400, color: 'var(--color-text-muted)', fontSize: 12 }}>(Run 1 → Run {report.runNumber})</span>
          </h2>
          <p style={{ fontSize: 12, color: 'var(--color-text-subtle)', marginBottom: 16 }}>
            Progress made since the first analysis run.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12 }}>
            {[
              { label: 'Run 1 findings', value: beforeAfter.run1FindingCount, color: 'var(--color-high)'   },
              { label: `Run ${report.runNumber} findings`, value: beforeAfter.run2FindingCount, color: 'var(--color-accent)' },
              { label: 'Fixed',      value: beforeAfter.fixedCount,     color: 'var(--color-pass)'   },
              { label: 'Remaining',  value: beforeAfter.remainingCount, color: 'var(--color-medium)' },
            ].map(({ label, value, color }) => (
              <StatCell key={label} label={label} value={value} color={color} />
            ))}
          </div>
        </div>
      )}

      {/* ── Workflow Timeline ── */}
      {workflowTimeline && workflowTimeline.length > 0 && (
        <div className="card" style={{ marginBottom: 28 }}>
          <h2 style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Workflow Timeline</h2>
          <p style={{ fontSize: 11, color: 'var(--color-text-subtle)', marginBottom: 14 }}>
            Real wall-clock durations recorded for this run.
          </p>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 320 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                  {['Module', 'Duration', 'Started'].map((h, i) => (
                    <th key={h} style={{
                      padding: '6px 0', fontWeight: 600, fontSize: 10,
                      textTransform: 'uppercase', letterSpacing: '0.06em',
                      color: 'var(--color-text-subtle)',
                      textAlign: i === 0 ? 'left' : 'right',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {workflowTimeline.map((step, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '8px 0', fontWeight: 500 }}>
                      {step.step.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                    </td>
                    <td style={{ padding: '8px 0', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--color-accent)' }}>
                      {formatMs(step.durationMs)}
                    </td>
                    <td style={{ padding: '8px 0', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--color-text-subtle)' }}>
                      {step.startedAt ? new Date(step.startedAt).toLocaleTimeString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Footer navigation ── */}
      <div style={{
        display: 'flex', gap: 10, justifyContent: 'space-between',
        flexWrap: 'wrap', paddingTop: 8,
      }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-secondary" style={{ fontSize: 13 }}
            onClick={() => navigate(`/analysis/${sessionId}/findings`)}>
            ← Findings
          </button>
          <button className="btn-secondary" style={{ fontSize: 13 }}
            onClick={() => navigate(`/analysis/${sessionId}/action-plan`)}>
            ← Action Plan
          </button>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-secondary" style={{ fontSize: 13 }}
            onClick={() => navigate('/')}>
            New Analysis
          </button>
          <button
            className="btn-ghost"
            onClick={handleReanalyze}
            disabled={reanalyzing}
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}
          >
            <IconRefresh size={13} />
            {reanalyzing ? 'Starting…' : 'Re-Run Analysis'}
          </button>
        </div>
      </div>
    </div>
  );
}
