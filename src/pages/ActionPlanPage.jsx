import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { SeverityBadge } from '../components/findings/SeverityBadge';

// ─── Static config ─────────────────────────────────────────────────────────────

const SEVERITIES = ['critical', 'high', 'medium', 'low', 'info'];

const EFFORT_CONFIG = {
  low:    { label: 'Low effort',    bg: 'var(--color-pass-bg)',   color: 'var(--color-pass)',   border: '#bbf7d0' },
  medium: { label: 'Medium effort', bg: 'var(--color-medium-bg)', color: 'var(--color-medium)', border: 'var(--color-medium-border)' },
  high:   { label: 'High effort',   bg: 'var(--color-high-bg)',   color: 'var(--color-high)',   border: 'var(--color-high-border)' },
};

const SEV_BORDER = {
  critical: 'var(--color-critical)',
  high:     'var(--color-high)',
  medium:   'var(--color-medium)',
  low:      'var(--color-pass)',
  info:     'var(--color-info)',
};

const WORKFLOW_STEPS = [
  { key: 'finding',    label: 'Finding',    desc: 'Issue detected' },
  { key: 'action',     label: 'Action',     desc: 'Plan item created' },
  { key: 'fix',        label: 'Fix',        desc: 'Apply or resolve' },
  { key: 'reanalyze',  label: 'Re-Analyze', desc: 'Run checks again' },
  { key: 'verified',   label: 'Verified',   desc: 'Confirmed resolved' },
];

// ─── SVG Icons ─────────────────────────────────────────────────────────────────

function IconCheck({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="2,7 6,11 12,3" />
    </svg>
  );
}
function IconAlert({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 1L13 12H1L7 1z" />
      <line x1="7" y1="6" x2="7" y2="8.5" />
      <circle cx="7" cy="10.5" r="0.5" fill="currentColor" />
    </svg>
  );
}
function IconX({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7" cy="7" r="6" />
      <line x1="4.5" y1="4.5" x2="9.5" y2="9.5" />
      <line x1="9.5" y1="4.5" x2="4.5" y2="9.5" />
    </svg>
  );
}
function IconBolt({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="8,1 4,7 7,7 6,13 10,7 7,7 8,1" />
    </svg>
  );
}
function IconRefresh({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v4H8" />
      <path d="M2 7a5 5 0 0 1 9.4-2.4L12 6" />
      <path d="M2 12v-4h4" />
      <path d="M12 7a5 5 0 0 1-9.4 2.4L2 8" />
    </svg>
  );
}
function IconWrench({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.5 1a3.5 3.5 0 0 1 0 7 3.5 3.5 0 0 1-3.2-2.1L2 10l1.5 1.5 4.3-4.3A3.5 3.5 0 0 1 9.5 1z" />
    </svg>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Derive a display status for an action plan item from its linked findings.
 * Returns one of: 'resolved' | 'in-progress' | 'open'
 */
function getItemStatus(item, findings) {
  const linked = (item.findingIds || []).map(id => findings.find(f => f.id === id)).filter(Boolean);
  if (linked.length === 0) return 'open';
  const allFixed = linked.every(f => f.status === 'fixed');
  if (allFixed) return 'resolved';
  const someFixed = linked.some(f => f.status === 'fixed');
  if (someFixed) return 'in-progress';
  return 'open';
}

const STATUS_CONFIG = {
  resolved:    { label: 'Resolved',    cls: 'badge-pass',     Icon: IconCheck },
  'in-progress':{ label: 'In Progress', cls: 'badge-warn',     Icon: IconAlert },
  open:        { label: 'Open',        cls: 'badge-critical',  Icon: IconX    },
};

// ─── Sub-components ────────────────────────────────────────────────────────────

function WorkflowBanner() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      background: 'var(--color-surface)', border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)', padding: '10px 16px',
      marginBottom: 28, overflowX: 'auto', gap: 0,
    }}>
      {WORKFLOW_STEPS.map((step, i) => (
        <React.Fragment key={step.key}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 74 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', color: 'var(--color-text)', textTransform: 'uppercase' }}>
              {step.label}
            </span>
            <span style={{ fontSize: 10, color: 'var(--color-text-subtle)', marginTop: 2 }}>{step.desc}</span>
          </div>
          {i < WORKFLOW_STEPS.length - 1 && (
            <div style={{ flex: '1 0 18px', height: 1, background: 'var(--color-border)', margin: '0 4px', minWidth: 14 }} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

function SeverityCountBar({ plan, findings }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
      {SEVERITIES.map(sev => {
        const count = plan.filter(item => item.severity === sev).length;
        if (count === 0) return null;
        const open = plan.filter(item => item.severity === sev && getItemStatus(item, findings) !== 'resolved').length;
        return (
          <div key={sev} className={`badge badge-${sev}`} style={{ fontSize: 12, padding: '4px 12px', gap: 6 }}>
            <span style={{ fontWeight: 800, fontFamily: 'var(--font-mono)' }}>{count}</span>
            <span style={{ textTransform: 'capitalize' }}>{sev}</span>
            {open < count && (
              <span style={{ opacity: 0.7, fontWeight: 400 }}>· {count - open} fixed</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function RecommendationSection({ item, findings }) {
  const linked = (item.findingIds || []).map(id => findings.find(f => f.id === id)).filter(Boolean);
  // Collect unique recommendations from linked findings
  const recommendations = [...new Set(linked.map(f => f.recommendation).filter(Boolean))];
  if (recommendations.length === 0) return null;
  return (
    <div style={{
      marginTop: 10, padding: '10px 12px',
      background: 'var(--color-surface)', borderRadius: 'var(--radius)',
      border: '1px solid var(--color-border)',
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', color: 'var(--color-text-subtle)', textTransform: 'uppercase', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
        <IconWrench size={11} />
        Recommended Action{recommendations.length > 1 ? 's' : ''}
      </div>
      <ul style={{ margin: 0, paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 3 }}>
        {recommendations.slice(0, 3).map((rec, i) => (
          <li key={i} style={{ fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.5 }}>{rec}</li>
        ))}
        {recommendations.length > 3 && (
          <li style={{ fontSize: 11, color: 'var(--color-text-subtle)', listStyle: 'none' }}>
            +{recommendations.length - 3} more recommendation{recommendations.length - 3 !== 1 ? 's' : ''}
          </li>
        )}
      </ul>
    </div>
  );
}

function ActionCard({ item, findings, remediating, onRemediate, navigate, sessionId }) {
  const [expanded, setExpanded] = useState(false);
  const linked = (item.findingIds || []).map(id => findings.find(f => f.id === id)).filter(Boolean);
  const status = getItemStatus(item, findings);
  const statusCfg = STATUS_CONFIG[status];
  const StatusIcon = statusCfg.Icon;
  const effortCfg = EFFORT_CONFIG[item.effort] || EFFORT_CONFIG.medium;
  const hasAutoFix = item.automated && linked.some(f => f.remediable && f.status !== 'fixed');
  const borderColor = SEV_BORDER[item.severity] || 'var(--color-border)';

  return (
    <div
      className="card"
      style={{
        borderLeft: `3px solid ${status === 'resolved' ? 'var(--color-pass)' : borderColor}`,
        opacity: status === 'resolved' ? 0.72 : 1,
        transition: 'box-shadow 0.15s',
      }}
    >
      {/* ── Top row ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>

        {/* Priority circle */}
        <div style={{
          minWidth: 34, height: 34, borderRadius: '50%', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 800, fontSize: 13, fontFamily: 'var(--font-mono)',
          background: status === 'resolved' ? 'var(--color-pass-bg)' : 'var(--color-surface)',
          border: `1.5px solid ${status === 'resolved' ? '#bbf7d0' : 'var(--color-border)'}`,
          color: status === 'resolved' ? 'var(--color-pass)' : 'var(--color-text)',
        }}>
          {status === 'resolved' ? <IconCheck size={14} /> : item.priority}
        </div>

        {/* Main content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Badge row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
            <SeverityBadge severity={item.severity} status={status === 'resolved' ? 'fixed' : 'open'} />

            {/* Item status badge */}
            <span className={`badge ${statusCfg.cls}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <StatusIcon size={10} />
              {statusCfg.label}
            </span>

            {/* Effort badge */}
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
              background: effortCfg.bg, color: effortCfg.color, border: `1px solid ${effortCfg.border}`,
            }}>
              {effortCfg.label}
            </span>

            {/* Auto-fix badge */}
            {hasAutoFix && (
              <span className="badge" style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                background: 'var(--color-accent-light)', color: 'var(--color-accent)',
                border: '1px solid #bfdbfe', fontSize: 11,
              }}>
                <IconBolt size={10} />
                Auto-fix available
              </span>
            )}
          </div>

          {/* Title */}
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4, lineHeight: 1.3 }}>
            {item.title}
          </div>

          {/* Why it matters (rationale) */}
          <p style={{ color: 'var(--color-text-muted)', fontSize: 13, margin: 0, lineHeight: 1.55 }}>
            {item.rationale}
          </p>

          {/* Expandable recommendation + linked files */}
          {expanded && (
            <>
              <RecommendationSection item={item} findings={findings} />

              {/* Linked finding chips */}
              {linked.length > 0 && (
                <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  <span style={{ fontSize: 11, color: 'var(--color-text-subtle)', alignSelf: 'center', marginRight: 2 }}>
                    Affected:
                  </span>
                  {linked.slice(0, 6).map(f => (
                    <span
                      key={f.id}
                      title={f.title}
                      style={{
                        fontSize: 11, fontFamily: 'var(--font-mono)',
                        background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                        borderRadius: 4, padding: '1px 6px', color: 'var(--color-text-muted)',
                        textDecoration: f.status === 'fixed' ? 'line-through' : 'none',
                        cursor: 'default',
                      }}
                    >
                      {f.affectedFile ? f.affectedFile.split('/').pop() : f.category}
                    </span>
                  ))}
                  {linked.length > 6 && (
                    <span style={{ fontSize: 11, color: 'var(--color-text-subtle)' }}>+{linked.length - 6} more</span>
                  )}
                </div>
              )}
            </>
          )}

          {/* Expand toggle */}
          <button
            onClick={() => setExpanded(v => !v)}
            style={{
              background: 'none', border: 'none', padding: '4px 0', marginTop: 6,
              fontSize: 12, color: 'var(--color-accent)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            {expanded ? '▲ Less detail' : '▼ Show recommendation'}
          </button>
        </div>

        {/* Actions column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0, alignItems: 'flex-end' }}>
          {hasAutoFix && (
            <button
              className="btn-primary"
              onClick={() => onRemediate(item)}
              disabled={remediating === item.id}
              style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}
            >
              {remediating === item.id ? (
                <><span className="spinner" style={{ width: 11, height: 11, borderWidth: 2 }} /> Applying…</>
              ) : (
                <><IconBolt size={12} /> Apply Fix</>
              )}
            </button>
          )}
          {/* Navigate to findings for this category */}
          <button
            className="btn-secondary"
            onClick={() => navigate(`/analysis/${sessionId}/findings`)}
            style={{ fontSize: 11, padding: '3px 10px' }}
          >
            View Findings
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export function ActionPlanPage({ sessionId }) {
  const navigate = useNavigate();
  const [plan, setPlan]         = useState([]);
  const [findings, setFindings] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [remediating, setRemediating] = useState(null);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [sevFilter, setSevFilter]     = useState('all');

  const load = useCallback(async () => {
    try {
      const [planData, findingsData] = await Promise.all([
        api.getActionPlan(sessionId),
        api.getFindings(sessionId),
      ]);
      setPlan(planData.actionPlan || []);
      setFindings(findingsData.findings || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => { load(); }, [load]);

  async function handleRemediate(item) {
    setRemediating(item.id);
    try {
      const remediable = (item.findingIds || [])
        .map(id => findings.find(f => f.id === id))
        .filter(f => f && f.remediable && f.status !== 'fixed');
      for (const f of remediable) {
        await api.remediate(sessionId, f.remediationId, f.id);
      }
      await load();
    } catch (err) {
      alert('Remediation failed: ' + err.message);
    } finally {
      setRemediating(null);
    }
  }

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

  // Derived counts
  const totalOpen     = plan.filter(item => getItemStatus(item, findings) !== 'resolved').length;
  const totalResolved = plan.filter(item => getItemStatus(item, findings) === 'resolved').length;
  const autoFixCount  = plan.filter(item => item.automated && getItemStatus(item, findings) !== 'resolved').length;

  // Filtered list
  const visiblePlan = sevFilter === 'all'
    ? plan
    : plan.filter(item => item.severity === sevFilter);

  // Available severities (for filter tabs)
  const presentSeverities = SEVERITIES.filter(s => plan.some(item => item.severity === s));

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 'var(--space-8) var(--space-6)' }}>

      {/* ── Page header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 4 }}>
            Release Action Plan
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>
            {plan.length} action item{plan.length !== 1 ? 's' : ''} ·{' '}
            <span style={{ color: 'var(--color-critical)', fontWeight: 600 }}>{totalOpen} open</span>
            {totalResolved > 0 && <> · <span style={{ color: 'var(--color-pass)', fontWeight: 600 }}>{totalResolved} resolved</span></>}
            {autoFixCount > 0 && <> · {autoFixCount} with auto-fix</>}
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

      {/* ── Workflow banner ── */}
      <WorkflowBanner />

      {/* ── Error ── */}
      {error && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 20,
          background: 'var(--color-critical-bg)', border: '1px solid var(--color-critical-border)',
          borderRadius: 'var(--radius)', padding: '12px 14px',
        }}>
          <IconX size={14} />
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-critical)' }}>Failed to load action plan</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>{error}</div>
          </div>
        </div>
      )}

      {/* ── Loading ── */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--color-text-muted)', fontSize: 13, padding: '32px 0' }}>
          <span className="spinner" />
          Loading action plan…
        </div>
      ) : plan.length === 0 ? (

        /* ── Empty state ── */
        <div style={{
          textAlign: 'center', padding: '48px 24px',
          background: 'var(--color-surface)', border: '1px dashed var(--color-border)',
          borderRadius: 'var(--radius-lg)', color: 'var(--color-text-muted)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10, color: 'var(--color-pass)' }}>
            <IconCheck size={32} />
          </div>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6, color: 'var(--color-pass)' }}>All clear!</div>
          <p style={{ fontSize: 13 }}>No action items. The project is looking great.</p>
          <button
            className="btn-ghost"
            onClick={handleReanalyze}
            disabled={reanalyzing}
            style={{ marginTop: 16, display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}
          >
            <IconRefresh size={13} />
            {reanalyzing ? 'Starting…' : 'Run another analysis'}
          </button>
        </div>

      ) : (
        <>
          {/* ── Severity count bar ── */}
          <SeverityCountBar plan={plan} findings={findings} />

          {/* ── Severity filter tabs ── */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 20, flexWrap: 'wrap' }}>
            {['all', ...presentSeverities].map(sev => {
              const active = sevFilter === sev;
              const count = sev === 'all' ? plan.length : plan.filter(i => i.severity === sev).length;
              return (
                <button
                  key={sev}
                  onClick={() => setSevFilter(sev)}
                  style={{
                    fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 20,
                    border: `1px solid ${active ? 'var(--color-accent)' : 'var(--color-border)'}`,
                    background: active ? 'var(--color-accent)' : 'var(--color-surface)',
                    color: active ? '#fff' : 'var(--color-text-muted)',
                    cursor: 'pointer', transition: 'all 0.12s',
                    textTransform: sev === 'all' ? 'none' : 'capitalize',
                  }}
                >
                  {sev === 'all' ? 'All' : sev} ({count})
                </button>
              );
            })}
          </div>

          {/* ── Action item cards ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {visiblePlan.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-subtle)', fontSize: 13 }}>
                No items match this filter.
              </div>
            ) : (
              visiblePlan.map(item => (
                <ActionCard
                  key={item.id}
                  item={item}
                  findings={findings}
                  remediating={remediating}
                  onRemediate={handleRemediate}
                  navigate={navigate}
                  sessionId={sessionId}
                />
              ))
            )}
          </div>

          {/* ── Footer nav ── */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', marginTop: 32, flexWrap: 'wrap' }}>
            <button className="btn-secondary" onClick={() => navigate(`/analysis/${sessionId}/findings`)} style={{ fontSize: 13 }}>
              ← Back to Findings
            </button>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-secondary" onClick={() => navigate(`/analysis/${sessionId}/report`)} style={{ fontSize: 13 }}>
                View Report →
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
        </>
      )}
    </div>
  );
}
