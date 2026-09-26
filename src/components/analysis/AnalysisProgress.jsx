import React from 'react';

const MODULE_LABELS = {
  'code-health': 'Code Health',
  'test-health': 'Test Health',
  'documentation': 'Documentation',
  'configuration': 'Configuration',
  'build-release': 'Build / Release',
};

const MODULE_ICONS = {
  'code-health': '🔍',
  'test-health': '🧪',
  'documentation': '📄',
  'configuration': '⚙️',
  'build-release': '🚀',
};

const STATUS_STYLES = {
  pending:   { color: 'var(--color-text-subtle)', bg: 'var(--color-surface)', dot: '#ccc' },
  running:   { color: 'var(--color-accent)',       bg: 'var(--color-accent-light)', dot: 'var(--color-accent)' },
  completed: { color: 'var(--color-pass)',         bg: 'var(--color-pass-bg)', dot: 'var(--color-pass)' },
  failed:    { color: 'var(--color-critical)',     bg: 'var(--color-critical-bg)', dot: 'var(--color-critical)' },
};

export function AnalysisProgress({ session }) {
  if (!session) return null;

  const moduleStatuses = session.moduleStatuses || {};
  const moduleTimings = session.moduleTimings || {};

  return (
    <div>
      {Object.entries(MODULE_LABELS).map(([key, label]) => {
        const status = moduleStatuses[key] || 'pending';
        const timing = moduleTimings[key];
        const style = STATUS_STYLES[status] || STATUS_STYLES.pending;

        return (
          <div
            key={key}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-3)',
              padding: 'var(--space-4)',
              marginBottom: 'var(--space-2)',
              background: style.bg,
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              transition: 'background 0.3s',
            }}
          >
            <span style={{ fontSize: 20, minWidth: 28 }}>{MODULE_ICONS[key]}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>{label}</div>
              {timing && (
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-subtle)', marginTop: 2 }}>
                  {timing.durationMs}ms
                </div>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {status === 'running' && (
                <span style={{
                  display: 'inline-block',
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: style.dot,
                  animation: 'pulse 1s infinite',
                }} />
              )}
              {status === 'completed' && <span style={{ color: style.dot, fontSize: 18 }}>✓</span>}
              {status === 'failed' && <span style={{ color: style.dot, fontSize: 18 }}>✗</span>}
              {status === 'pending' && <span style={{ color: style.dot, fontSize: 16 }}>○</span>}
              <span style={{
                fontSize: 'var(--font-size-xs)',
                fontWeight: 600,
                color: style.color,
                textTransform: 'capitalize',
              }}>
                {status}
              </span>
            </div>
          </div>
        );
      })}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.85); }
        }
      `}</style>
    </div>
  );
}
