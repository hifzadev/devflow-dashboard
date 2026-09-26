import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { id: 'code-health',    label: 'Code Health',    abbr: 'CODE HEALTH',    icon: CodeHealthIcon    },
  { id: 'test-health',    label: 'Test Health',    abbr: 'TEST HEALTH',    icon: TestHealthIcon    },
  { id: 'documentation',  label: 'Documentation',  abbr: 'DOCUMENTATION',  icon: DocsIcon          },
  { id: 'configuration',  label: 'Configuration',  abbr: 'CONFIGURATION',  icon: ConfigIcon        },
  { id: 'build-release',  label: 'Build / Release',abbr: 'BUILD/RELEASE',  icon: BuildIcon         },
];

const WORKFLOW_STEPS = [
  { key: 'project',     label: 'Project',     desc: 'Select project' },
  { key: 'analyze',     label: 'Analyze',     desc: 'Run 5 modules' },
  { key: 'findings',    label: 'Findings',    desc: 'Review issues' },
  { key: 'action-plan', label: 'Action Plan', desc: 'Prioritized fixes' },
  { key: 'reanalyze',   label: 'Re-Analyze',  desc: 'Apply & verify' },
  { key: 'readiness',   label: 'Report',      desc: 'Readiness score' },
];

const LAST_SESSION_KEY = 'devflow_last_session';

// ─── SVG Icons ────────────────────────────────────────────────────────────────

function CodeHealthIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="1,8 4,4 7,10 10,6 13,8 15,8" />
    </svg>
  );
}
function TestHealthIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2l1 4H3L6 2z" /><path d="M6 6v7" /><path d="M3 13h6" />
      <path d="M10 5h4M10 8h3M10 11h4" />
    </svg>
  );
}
function DocsIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="1" width="10" height="13" rx="1" /><path d="M5 5h6M5 8h6M5 11h4" />
      <path d="M12 4l2 2-2 2" />
    </svg>
  );
}
function ConfigIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="2" />
      <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.2 3.2l1.4 1.4M11.4 11.4l1.4 1.4M3.2 12.8l1.4-1.4M11.4 4.6l1.4-1.4" />
    </svg>
  );
}
function BuildIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 11l4-7 4 7H2z" /><path d="M10 4l4 7h-4V4z" />
    </svg>
  );
}
function CheckIcon({ size = 12 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="2,6 5,9 10,3" />
    </svg>
  );
}
function WarnIcon({ size = 12 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 1L11 10H1L6 1z" /><line x1="6" y1="5" x2="6" y2="7" /><circle cx="6" cy="9" r="0.5" fill="currentColor" />
    </svg>
  );
}
function FailIcon({ size = 12 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="6" r="5" /><line x1="4" y1="4" x2="8" y2="8" /><line x1="8" y1="4" x2="4" y2="8" />
    </svg>
  );
}
function PendingIcon({ size = 12 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="6" cy="6" r="5" /><line x1="6" y1="3" x2="6" y2="7" /><line x1="6" y1="9" x2="6" y2="9.5" />
    </svg>
  );
}

// ─── Status helpers ────────────────────────────────────────────────────────────

function getCategoryStatus(findings, categoryId) {
  const cats = findings.filter(f => f.category === categoryId && f.status !== 'fixed');
  if (cats.length === 0) return { key: 'pass',    label: 'Passed',   icon: CheckIcon,   cls: 'badge-pass'   };
  const hasCrit = cats.some(f => f.severity === 'critical');
  const hasHigh = cats.some(f => f.severity === 'high');
  if (hasCrit) return   { key: 'fail',    label: 'Critical', icon: FailIcon,    cls: 'badge-critical' };
  if (hasHigh) return   { key: 'warn',    label: 'Warning',  icon: WarnIcon,    cls: 'badge-warn'   };
  return                { key: 'warn',    label: 'Warning',  icon: WarnIcon,    cls: 'badge-warn'   };
}

function getReadinessInfo(score) {
  if (score >= 80) return { label: 'Release Ready',    color: 'var(--color-pass)',   ring: '#16a34a' };
  if (score >= 50) return { label: 'Needs Attention',  color: '#d97706',             ring: '#d97706' };
  return                   { label: 'Not Ready',        color: 'var(--color-critical)',ring: '#dc2626' };
}

function computeReadiness(findings) {
  const open = findings.filter(f => f.status !== 'fixed');
  const critical = open.filter(f => f.severity === 'critical').length;
  const high     = open.filter(f => f.severity === 'high').length;
  const medium   = open.filter(f => f.severity === 'medium').length;
  const low      = open.filter(f => f.severity === 'low').length;
  const penalty  = critical * 20 + high * 10 + medium * 4 + low * 1;
  return Math.max(0, Math.min(100, 100 - penalty));
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function WorkflowBanner() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 0,
      background: 'var(--color-surface)', border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)', padding: '10px 16px',
      marginBottom: 32, overflowX: 'auto',
    }}>
      {WORKFLOW_STEPS.map((step, i) => (
        <React.Fragment key={step.key}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 72 }}>
            <span style={{
              fontSize: 11, fontWeight: 700, letterSpacing: '0.04em',
              color: 'var(--color-text)', textTransform: 'uppercase',
            }}>{step.label}</span>
            <span style={{ fontSize: 10, color: 'var(--color-text-subtle)', marginTop: 2 }}>{step.desc}</span>
          </div>
          {i < WORKFLOW_STEPS.length - 1 && (
            <div style={{ flex: '1 0 20px', height: 1, background: 'var(--color-border)', margin: '0 4px', minWidth: 16 }} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

function CategoryCard({ cat, findings, sessionId, navigate }) {
  const IconComp = cat.icon;
  const status = getCategoryStatus(findings, cat.id);
  const StatusIcon = status.icon;
  const catFindings = findings.filter(f => f.category === cat.id && f.status !== 'fixed');

  const borderColor = status.key === 'fail'
    ? 'var(--color-critical-border)'
    : status.key === 'warn'
    ? 'var(--color-medium-border)'
    : '#bbf7d0';

  return (
    <div
      className="card"
      onClick={() => sessionId && navigate(`/analysis/${sessionId}/findings`)}
      style={{
        padding: '16px 18px',
        borderLeft: `3px solid ${borderColor}`,
        cursor: sessionId ? 'pointer' : 'default',
        transition: 'box-shadow 0.15s, transform 0.12s',
        display: 'flex', flexDirection: 'column', gap: 10,
      }}
      onMouseEnter={e => { if (sessionId) { e.currentTarget.style.boxShadow = 'var(--shadow-md)'; e.currentTarget.style.transform = 'translateY(-1px)'; } }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.transform = ''; }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'var(--color-text-muted)' }}>
          <IconComp size={15} />
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            {cat.abbr}
          </span>
        </div>
        <span className={`badge ${status.cls}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <StatusIcon size={10} />
          {status.label}
        </span>
      </div>

      {/* Findings count */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{ fontSize: 26, fontWeight: 800, lineHeight: 1, fontFamily: 'var(--font-mono)', color: catFindings.length === 0 ? 'var(--color-pass)' : 'var(--color-text)' }}>
          {catFindings.length}
        </span>
        <span style={{ fontSize: 12, color: 'var(--color-text-subtle)' }}>
          {catFindings.length === 1 ? 'issue' : 'issues'}
        </span>
      </div>

      {/* Severity breakdown pills */}
      {catFindings.length > 0 && (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {['critical','high','medium','low'].map(sev => {
            const cnt = catFindings.filter(f => f.severity === sev).length;
            if (!cnt) return null;
            return (
              <span key={sev} className={`badge badge-${sev}`} style={{ fontSize: 10 }}>
                {cnt} {sev}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ReadinessGauge({ score, info }) {
  const circumference = 2 * Math.PI * 40;
  const offset = circumference - (score / 100) * circumference;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <svg width={100} height={100} viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="40" fill="none" stroke="var(--color-border)" strokeWidth="8" />
        <circle
          cx="50" cy="50" r="40" fill="none"
          stroke={info.ring} strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
        <text x="50" y="54" textAnchor="middle" fontSize="22" fontWeight="800" fill={info.color} fontFamily="'Cascadia Code','Fira Code',Consolas,monospace">
          {score}
        </text>
      </svg>
      <span style={{ fontSize: 11, fontWeight: 700, color: info.color, textAlign: 'center', letterSpacing: '0.03em' }}>
        {info.label}
      </span>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export function DashboardPage({ onSessionStart }) {
  const navigate = useNavigate();
  const [projects, setProjects]   = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [projectError, setProjectError] = useState(null);

  const [lastSession, setLastSession]   = useState(null);  // { id, projectName, status, ... }
  const [findings, setFindings]         = useState(null);  // array or null
  const [loadingSession, setLoadingSession] = useState(false);
  const [starting, setStarting]         = useState(null);  // projectId being started

  // Load projects on mount
  useEffect(() => {
    api.listProjects()
      .then(setProjects)
      .catch(() => setProjectError('Cannot reach backend on port 3001. Is the server running?'))
      .finally(() => setLoadingProjects(false));
  }, []);

  // Load last session data if we have a stored sessionId
  const loadLastSession = useCallback(async (sessionId) => {
    if (!sessionId) return;
    setLoadingSession(true);
    try {
      const [statusData, findingsData] = await Promise.all([
        api.getStatus(sessionId),
        api.getFindings(sessionId),
      ]);
      setLastSession(statusData);
      setFindings(findingsData.findings || []);
    } catch {
      // Session expired or not found — clear stored id
      localStorage.removeItem(LAST_SESSION_KEY);
    } finally {
      setLoadingSession(false);
    }
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem(LAST_SESSION_KEY);
    if (stored) loadLastSession(stored);
  }, [loadLastSession]);

  async function handleStart(projectId) {
    setStarting(projectId);
    setProjectError(null);
    try {
      const { sessionId } = await api.startAnalysis(projectId);
      localStorage.setItem(LAST_SESSION_KEY, sessionId);
      onSessionStart(sessionId);
      navigate(`/analysis/${sessionId}`);
    } catch (e) {
      setProjectError(e.message);
    } finally {
      setStarting(null);
    }
  }

  const readiness = findings ? computeReadiness(findings) : null;
  const readinessInfo = readiness !== null ? getReadinessInfo(readiness) : null;
  const hasCompletedSession = lastSession?.status === 'completed';

  return (
    <div style={{ maxWidth: 'var(--content-max)', margin: '0 auto', padding: '32px 24px' }}>

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 4 }}>
          Release Readiness Dashboard
        </h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>
          AI-powered pre-release checks across code, tests, docs, config, and build.
        </p>
      </div>

      {/* ── Workflow guide ───────────────────────────────────────────────── */}
      <WorkflowBanner />

      {/* ── Last session summary (only if completed) ────────────────────── */}
      {loadingSession && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28, color: 'var(--color-text-muted)', fontSize: 13 }}>
          <span className="spinner" />
          Loading last session…
        </div>
      )}

      {hasCompletedSession && findings && (
        <div style={{ marginBottom: 36 }}>
          {/* Summary header row */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexWrap: 'wrap', gap: 16, marginBottom: 16,
          }}>
            <div>
              <h2 className="section-title" style={{ marginBottom: 4 }}>Last Analysis</h2>
              <p style={{ fontSize: 12, color: 'var(--color-text-subtle)' }}>
                {lastSession.projectName} · Run #{lastSession.runNumber} · {new Date(lastSession.completedAt).toLocaleString()}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn-secondary"
                style={{ fontSize: 12 }}
                onClick={() => navigate(`/analysis/${lastSession.sessionId}/findings`)}
              >
                View Findings
              </button>
              <button
                className="btn-secondary"
                style={{ fontSize: 12 }}
                onClick={() => navigate(`/analysis/${lastSession.sessionId}/action-plan`)}
              >
                Action Plan
              </button>
              <button
                className="btn-secondary"
                style={{ fontSize: 12 }}
                onClick={() => navigate(`/analysis/${lastSession.sessionId}/report`)}
              >
                Full Report
              </button>
            </div>
          </div>

          {/* Score + category cards — stack on narrow screens */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'start' }}>
            {/* Gauge */}
            <div
              className="card"
              style={{ padding: '16px 12px', display: 'flex', justifyContent: 'center', flexShrink: 0 }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0,0,0,0.1),0 8px 10px -6px rgba(0,0,0,0.1)'; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = ''; }}
            >
              <ReadinessGauge score={readiness} info={readinessInfo} />
            </div>

            {/* Category grid — takes remaining space, min 280px so it wraps below gauge on small screens */}
            <div style={{ flex: '1 1 280px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
              {CATEGORIES.map(cat => (
                <CategoryCard
                  key={cat.id}
                  cat={cat}
                  findings={findings}
                  sessionId={lastSession.sessionId}
                  navigate={navigate}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* If session exists but is still running / failed, show a banner */}
      {lastSession && !hasCompletedSession && !loadingSession && (
        <div style={{
          marginBottom: 28, padding: '14px 16px',
          background: lastSession.status === 'failed' ? 'var(--color-critical-bg)' : 'var(--color-accent-light)',
          border: `1px solid ${lastSession.status === 'failed' ? 'var(--color-critical-border)' : '#bfdbfe'}`,
          borderRadius: 'var(--radius-lg)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
        }}>
          <div style={{ fontSize: 13, color: lastSession.status === 'failed' ? 'var(--color-critical)' : 'var(--color-accent)', fontWeight: 500 }}>
            {lastSession.status === 'failed'
              ? `Analysis failed: ${lastSession.error || 'unknown error'}`
              : `Analysis in progress for ${lastSession.projectName}…`}
          </div>
          {lastSession.status !== 'failed' && (
            <button className="btn-primary" style={{ fontSize: 12 }}
              onClick={() => navigate(`/analysis/${lastSession.sessionId}`)}>
              View Progress →
            </button>
          )}
        </div>
      )}

      {/* ── Project selection ────────────────────────────────────────────── */}
      <section>
        <h2 className="section-title">
          {hasCompletedSession ? 'Run New Analysis' : 'Select Project to Analyze'}
        </h2>

        {projectError && (
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 10,
            background: 'var(--color-critical-bg)', border: '1px solid var(--color-critical-border)',
            borderRadius: 'var(--radius)', padding: '12px 14px', marginBottom: 16,
          }}>
            <FailIcon size={14} />
            <div>
              <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-critical)' }}>Connection Error</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>{projectError}</div>
            </div>
          </div>
        )}

        {loadingProjects ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--color-text-muted)', fontSize: 13, padding: '20px 0' }}>
            <span className="spinner" />
            Loading projects…
          </div>
        ) : projects.length === 0 && !projectError ? (
          <div style={{
            padding: '32px 24px', textAlign: 'center',
            background: 'var(--color-surface)', border: '1px dashed var(--color-border)',
            borderRadius: 'var(--radius-lg)', color: 'var(--color-text-muted)', fontSize: 13,
          }}>
            <PendingIcon size={24} />
            <p style={{ marginTop: 8 }}>No projects found. Make sure the backend is running.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {projects.map(p => (
              <div
                key={p.id}
                className="card"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  gap: 16, padding: '14px 18px', flexWrap: 'wrap',
                }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0,0,0,0.1),0 8px 10px -6px rgba(0,0,0,0.1)'; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = ''; }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 3 }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 4 }}>{p.description}</div>
                  <span style={{
                    display: 'inline-block', fontSize: 10, fontWeight: 600,
                    background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                    borderRadius: 4, padding: '1px 6px', color: 'var(--color-text-subtle)',
                    textTransform: 'uppercase', letterSpacing: '0.04em',
                  }}>
                    {p.language}
                  </span>
                </div>
                <button
                  className="btn-primary"
                  disabled={starting === p.id}
                  onClick={() => handleStart(p.id)}
                  style={{ whiteSpace: 'nowrap', minWidth: 110 }}
                >
                  {starting === p.id ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <span className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} />
                      Starting…
                    </span>
                  ) : (
                    '▶ Analyze'
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
