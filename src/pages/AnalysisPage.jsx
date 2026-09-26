import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';

const POLL_INTERVAL = 1500;

// ─── Module definitions (ordered) ────────────────────────────────────────────

const MODULES = [
  {
    key: 'code-health',
    label: 'Code Health',
    desc: 'Scanning for TODO/FIXME markers, unguarded async functions, console.log calls, long functions',
  },
  {
    key: 'test-health',
    label: 'Test Health',
    desc: 'Running test suite, checking coverage gaps and missing test files',
  },
  {
    key: 'documentation',
    label: 'Documentation',
    desc: 'Inspecting README completeness, missing env-var docs, and API documentation',
  },
  {
    key: 'configuration',
    label: 'Configuration',
    desc: 'Checking package.json fields, .gitignore, .env.example, and semver validity',
  },
  {
    key: 'build-release',
    label: 'Build / Release',
    desc: 'Running npm install, verifying build scripts, and validating release readiness',
  },
];

// ─── SVG Icons ────────────────────────────────────────────────────────────────

function IconCheck({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="2,8 6,12 14,4" />
    </svg>
  );
}
function IconX({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="4" x2="12" y2="12" />
      <line x1="12" y1="4" x2="4" y2="12" />
    </svg>
  );
}
function IconClock({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="6.5" />
      <polyline points="8,4.5 8,8 10.5,9.5" />
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

function CodeHealthIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="1,8 4,4 7,10 10,6 13,8 15,8" />
    </svg>
  );
}
function TestIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2l1 4H3L6 2z" /><path d="M6 6v7" /><path d="M3 13h6" />
      <path d="M10 5h4M10 8h3M10 11h4" />
    </svg>
  );
}
function DocsIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="1" width="10" height="13" rx="1" /><path d="M5 5h6M5 8h6M5 11h4" />
    </svg>
  );
}
function ConfigIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="2" />
      <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.2 3.2l1.4 1.4M11.4 11.4l1.4 1.4M3.2 12.8l1.4-1.4M11.4 4.6l1.4-1.4" />
    </svg>
  );
}
function BuildIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 11l4-7 4 7H2z" /><path d="M10 4l4 7h-4V4z" />
    </svg>
  );
}

const MODULE_ICONS = {
  'code-health':   CodeHealthIcon,
  'test-health':   TestIcon,
  'documentation': DocsIcon,
  'configuration': ConfigIcon,
  'build-release': BuildIcon,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMs(ms) {
  if (!ms && ms !== 0) return '—';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function computeProgress(moduleStatuses) {
  if (!moduleStatuses) return 0;
  const vals = Object.values(moduleStatuses);
  if (vals.length === 0) return 0;
  const done = vals.filter(s => s === 'completed' || s === 'failed').length;
  return Math.round((done / vals.length) * 100);
}

// ─── Module row component ─────────────────────────────────────────────────────

function ModuleRow({ mod, status, timing, index }) {
  const IconComp = MODULE_ICONS[mod.key];

  const isRunning   = status === 'running';
  const isCompleted = status === 'completed';
  const isFailed    = status === 'failed';
  const isPending   = !isRunning && !isCompleted && !isFailed;

  const rowBg = isRunning   ? 'var(--color-accent-light)'
              : isCompleted ? 'var(--color-pass-bg)'
              : isFailed    ? 'var(--color-critical-bg)'
              : 'var(--color-surface)';

  const accentColor = isRunning   ? 'var(--color-accent)'
                    : isCompleted ? 'var(--color-pass)'
                    : isFailed    ? 'var(--color-critical)'
                    : 'var(--color-text-subtle)';

  const leftBorder = isRunning   ? 'var(--color-accent)'
                   : isCompleted ? 'var(--color-pass)'
                   : isFailed    ? 'var(--color-critical)'
                   : 'var(--color-border)';

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '14px 16px', marginBottom: 8,
      background: rowBg,
      border: '1px solid var(--color-border)',
      borderLeft: `3px solid ${leftBorder}`,
      borderRadius: 'var(--radius-lg)',
      transition: 'background 0.3s, border-color 0.3s',
    }}>
      {/* Step number / icon slot */}
      <div style={{
        minWidth: 32, height: 32, borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: isPending ? 'var(--color-surface-2)' : rowBg,
        border: `1.5px solid ${isPending ? 'var(--color-border)' : leftBorder}`,
        color: accentColor, flexShrink: 0,
      }}>
        {isCompleted ? <IconCheck size={14} /> :
         isFailed    ? <IconX size={14} /> :
         isRunning   ? <span className="spinner" style={{ width: 13, height: 13, borderWidth: 2, borderTopColor: 'var(--color-accent)', borderColor: '#bfdbfe' }} /> :
         <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--color-text-subtle)' }}>{index + 1}</span>}
      </div>

      {/* Icon + text */}
      <div style={{ color: accentColor, display: 'flex', alignItems: 'center', flexShrink: 0 }}>
        <IconComp size={17} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-text)', marginBottom: 2 }}>
          {mod.label}
        </div>
        <div style={{ fontSize: 12, color: 'var(--color-text-subtle)', lineHeight: 1.4 }}>
          {isRunning ? (
            <span style={{ color: 'var(--color-accent)', fontWeight: 500 }}>Running…</span>
          ) : isCompleted ? (
            <span style={{ color: 'var(--color-pass)' }}>
              Completed{timing?.durationMs ? ` in ${formatMs(timing.durationMs)}` : ''}
            </span>
          ) : isFailed ? (
            <span style={{ color: 'var(--color-critical)' }}>Failed</span>
          ) : (
            mod.desc
          )}
        </div>
      </div>

      {/* Status label */}
      <div style={{ flexShrink: 0 }}>
        {isRunning && (
          <span className="badge badge-info" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--color-info)', display: 'inline-block', animation: 'pulse 1s infinite' }} />
            Running
          </span>
        )}
        {isCompleted && (
          <span className="badge badge-pass" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <IconCheck size={10} /> Done
          </span>
        )}
        {isFailed && (
          <span className="badge badge-critical" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <IconX size={10} /> Failed
          </span>
        )}
        {isPending && (
          <span style={{ fontSize: 11, color: 'var(--color-text-subtle)', fontWeight: 500 }}>Waiting</span>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function AnalysisPage({ sessionId, onSessionStart }) {
  const navigate = useNavigate();
  const [session, setSession]   = useState(null);
  const [error, setError]       = useState(null);
  const [elapsed, setElapsed]   = useState(0);
  const intervalRef  = useRef(null);
  const timerRef     = useRef(null);
  const startTimeRef = useRef(Date.now());

  useEffect(() => {
    if (!sessionId) return;

    timerRef.current = setInterval(() => {
      setElapsed(Date.now() - startTimeRef.current);
    }, 500);

    async function poll() {
      try {
        const data = await api.getStatus(sessionId);
        setSession(data);
        onSessionStart && onSessionStart(sessionId);

        if (data.status === 'completed') {
          clearInterval(intervalRef.current);
          clearInterval(timerRef.current);
          setTimeout(() => navigate(`/analysis/${sessionId}/findings`), 1400);
        } else if (data.status === 'failed') {
          clearInterval(intervalRef.current);
          clearInterval(timerRef.current);
          setError(data.error || 'Analysis failed unexpectedly.');
        }
      } catch (err) {
        setError(err.message);
        clearInterval(intervalRef.current);
        clearInterval(timerRef.current);
      }
    }

    poll();
    intervalRef.current = setInterval(poll, POLL_INTERVAL);

    return () => {
      clearInterval(intervalRef.current);
      clearInterval(timerRef.current);
    };
  // onSessionStart is a stable callback from App — intentionally omitted from deps
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const progress  = computeProgress(session?.moduleStatuses);
  const isRunning = session?.status === 'running' || session?.status === 'pending';
  const isDone    = session?.status === 'completed';
  const isFailed  = session?.status === 'failed' || !!error;

  const displayTime = isDone && session?.totalDurationMs
    ? formatMs(session.totalDurationMs)
    : formatMs(elapsed);

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: 'var(--space-8) var(--space-6)' }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 4 }}>
          {isDone ? 'Analysis Complete' : isFailed ? 'Analysis Failed' : 'Analyzing Project…'}
        </h1>
        {session && (
          <p style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>
            {session.projectName}
            {session.runNumber > 1 && ` · Re-run #${session.runNumber}`}
          </p>
        )}
        {!session && !error && (
          <p style={{ color: 'var(--color-text-subtle)', fontSize: 13 }}>
            Connecting to analysis engine…
          </p>
        )}
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 24,
          padding: '14px 16px',
          background: 'var(--color-critical-bg)', border: '1px solid var(--color-critical-border)',
          borderRadius: 'var(--radius-lg)', color: 'var(--color-critical)',
        }}>
          <div style={{ flexShrink: 0, marginTop: 1 }}><IconX size={16} /></div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>Analysis error</div>
            <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{error}</div>
          </div>
          <button
            className="btn-secondary"
            style={{ fontSize: 12, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5 }}
            onClick={() => navigate('/')}
          >
            ← New Analysis
          </button>
        </div>
      )}

      {/* ── Timer + status strip ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
        marginBottom: 20, padding: '14px 16px',
        background: 'var(--color-surface)', border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-text-muted)' }}>
          <IconClock size={15} />
          <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Elapsed</span>
        </div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 800, color: isDone ? 'var(--color-pass)' : 'var(--color-text)' }}>
          {displayTime}
        </span>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Overall progress percent */}
          {isRunning && (
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-accent)', fontFamily: 'var(--font-mono)' }}>
              {progress}%
            </span>
          )}

          {/* Status badge */}
          {session?.status === 'pending' && (
            <span className="badge" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-muted)', fontSize: 11 }}>
              Queued
            </span>
          )}
          {session?.status === 'running' && (
            <span className="badge badge-info" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11 }}>
              <span className="spinner" style={{ width: 9, height: 9, borderWidth: 2, borderTopColor: 'var(--color-info)', borderColor: 'var(--color-info-border)' }} />
              Running
            </span>
          )}
          {isDone && (
            <span className="badge badge-pass" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
              <IconCheck size={10} /> Complete
            </span>
          )}
          {session?.status === 'failed' && (
            <span className="badge badge-critical" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
              <IconX size={10} /> Failed
            </span>
          )}
        </div>
      </div>

      {/* ── Overall progress bar ── */}
      {(isRunning || isDone) && (
        <div style={{ marginBottom: 24 }}>
          <div style={{
            height: 5, borderRadius: 3,
            background: 'var(--color-border)',
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: `${isDone ? 100 : progress}%`,
              background: isDone ? 'var(--color-pass)' : 'var(--color-accent)',
              borderRadius: 3,
              transition: 'width 0.4s ease',
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
            <span style={{ fontSize: 10, color: 'var(--color-text-subtle)' }}>
              {isDone ? 'All checks complete' : 'Running analysis modules…'}
            </span>
            <span style={{ fontSize: 10, color: 'var(--color-text-subtle)', fontFamily: 'var(--font-mono)' }}>
              {isDone ? '5 / 5' : `${Math.round(progress / 20)} / 5`}
            </span>
          </div>
        </div>
      )}

      {/* ── Module rows ── */}
      <div>
        {MODULES.map((mod, index) => {
          const status = session?.moduleStatuses?.[mod.key] || 'pending';
          const timing = session?.moduleTimings?.[mod.key];
          return (
            <ModuleRow
              key={mod.key}
              mod={mod}
              status={status}
              timing={timing}
              index={index}
            />
          );
        })}
      </div>

      {/* ── No session yet — initial loading placeholder ── */}
      {!session && !error && (
        <div style={{
          marginTop: 12, padding: '14px 16px', textAlign: 'center',
          color: 'var(--color-text-subtle)', fontSize: 13,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        }}>
          <span className="spinner" />
          Waiting for analysis engine…
        </div>
      )}

      {/* ── Completion banner ── */}
      {isDone && (
        <div style={{
          marginTop: 20, padding: '16px 20px',
          background: 'var(--color-pass-bg)', border: '1px solid #bbf7d0',
          borderRadius: 'var(--radius-lg)',
          display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
        }}>
          <div style={{ color: 'var(--color-pass)', display: 'flex', alignItems: 'center' }}>
            <IconCheck size={24} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-pass)' }}>
              Analysis complete in {formatMs(session.totalDurationMs)}
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
              Redirecting to findings in a moment…
            </div>
          </div>
          <button
            className="btn-primary"
            style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}
            onClick={() => navigate(`/analysis/${sessionId}/findings`)}
          >
            View Findings →
          </button>
        </div>
      )}

      {/* ── Failed footer ── */}
      {isFailed && !isDone && (
        <div style={{ marginTop: 20, display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button
            className="btn-secondary"
            style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
            onClick={() => navigate('/')}
          >
            <IconRefresh size={13} /> Try Again
          </button>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.5; transform: scale(0.8); }
        }
      `}</style>
    </div>
  );
}
