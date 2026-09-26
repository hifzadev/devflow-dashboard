import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { FindingCard } from '../components/findings/FindingCard';

const CATEGORIES = [
  { key: 'all', label: 'All' },
  { key: 'code-health', label: 'Code Health' },
  { key: 'test-health', label: 'Test Health' },
  { key: 'documentation', label: 'Documentation' },
  { key: 'configuration', label: 'Configuration' },
  { key: 'build-release', label: 'Build / Release' },
];

const SEVERITIES = ['all', 'critical', 'high', 'medium', 'low', 'info'];

// ─── SVG Icons ────────────────────────────────────────────────────────────────

function IconCheck({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4,14 11,21 24,7" />
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

export function FindingsPage({ sessionId }) {
  const navigate = useNavigate();
  const [findings, setFindings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeSeverity, setActiveSeverity] = useState('all');
  const [remediating, setRemediating] = useState(null);

  const loadFindings = useCallback(async () => {
    try {
      const data = await api.getFindings(sessionId);
      setFindings(data.findings || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => { loadFindings(); }, [loadFindings]);

  async function handleRemediate(finding) {
    setRemediating(finding.id);
    try {
      await api.remediate(sessionId, finding.remediationId, finding.id);
      await loadFindings();
    } catch (err) {
      alert('Remediation failed: ' + err.message);
    } finally {
      setRemediating(null);
    }
  }

  const filtered = findings.filter(f => {
    if (activeCategory !== 'all' && f.category !== activeCategory) return false;
    if (activeSeverity !== 'all' && f.severity !== activeSeverity) return false;
    return true;
  });

  const counts = {
    all: findings.length,
    critical: findings.filter(f => f.severity === 'critical' && f.status !== 'fixed').length,
    high: findings.filter(f => f.severity === 'high' && f.status !== 'fixed').length,
    medium: findings.filter(f => f.severity === 'medium' && f.status !== 'fixed').length,
    low: findings.filter(f => f.severity === 'low' && f.status !== 'fixed').length,
    info: findings.filter(f => f.severity === 'info').length,
    fixed: findings.filter(f => f.status === 'fixed').length,
  };

  return (
    <div style={{ maxWidth: 'var(--content-max)', margin: '0 auto', padding: 'var(--space-8) var(--space-6)' }}>
      {/* Header — flex-wrap so buttons stack on mobile */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 'var(--space-6)' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 4 }}>Findings</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>
            {findings.length} finding{findings.length !== 1 ? 's' : ''} detected
            {counts.fixed > 0 && <> · <span style={{ color: 'var(--color-pass)' }}>{counts.fixed} fixed</span></>}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn-secondary" style={{ fontSize: 13 }} onClick={() => navigate(`/analysis/${sessionId}/action-plan`)}>
            Action Plan →
          </button>
          <button className="btn-secondary" style={{ fontSize: 13 }} onClick={() => navigate(`/analysis/${sessionId}/report`)}>
            Report →
          </button>
        </div>
      </div>

      {/* Score summary chips */}
      <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginBottom: 'var(--space-5)' }}>
        {[
          { key: 'critical', label: 'Critical', cls: 'badge-critical' },
          { key: 'high', label: 'High', cls: 'badge-high' },
          { key: 'medium', label: 'Medium', cls: 'badge-medium' },
          { key: 'low', label: 'Low', cls: 'badge-low' },
          { key: 'info', label: 'Info', cls: 'badge-info' },
          { key: 'fixed', label: 'Fixed', cls: 'badge-fixed' },
        ].map(({ key, label, cls }) => counts[key] > 0 && (
          <span key={key} className={`badge ${cls}`} style={{ fontSize: 12 }}>
            {counts[key]} {label}
          </span>
        ))}
      </div>

      {/* Category tabs */}
      <div style={{
        display: 'flex',
        gap: 2,
        borderBottom: '1px solid var(--color-border)',
        marginBottom: 'var(--space-5)',
        overflowX: 'auto',
      }}>
        {CATEGORIES.map(cat => {
          const catCount = cat.key === 'all'
            ? findings.length
            : findings.filter(f => f.category === cat.key).length;
          return (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              style={{
                background: 'transparent',
                border: 'none',
                borderBottom: `2px solid ${activeCategory === cat.key ? 'var(--color-accent)' : 'transparent'}`,
                borderRadius: 0,
                color: activeCategory === cat.key ? 'var(--color-accent)' : 'var(--color-text-muted)',
                fontWeight: activeCategory === cat.key ? 600 : 400,
                padding: 'var(--space-2) var(--space-4)',
                fontSize: 'var(--font-size-sm)',
                whiteSpace: 'nowrap',
                cursor: 'pointer',
              }}
            >
              {cat.label} {catCount > 0 && <span style={{ opacity: 0.7, fontSize: 11 }}>({catCount})</span>}
            </button>
          );
        })}
      </div>

      {/* Severity filter — with count per severity */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 'var(--space-5)', flexWrap: 'wrap' }}>
        {SEVERITIES.map(sev => {
          const cnt = sev === 'all' ? findings.length : (counts[sev] ?? 0);
          const active = activeSeverity === sev;
          return (
            <button
              key={sev}
              onClick={() => setActiveSeverity(sev)}
              style={{
                fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 20,
                border: `1px solid ${active ? 'var(--color-accent)' : 'var(--color-border)'}`,
                background: active ? 'var(--color-accent)' : 'var(--color-surface)',
                color: active ? '#fff' : 'var(--color-text-muted)',
                cursor: 'pointer', transition: 'all 0.12s',
                textTransform: sev === 'all' ? 'none' : 'capitalize',
              }}
            >
              {sev === 'all' ? 'All' : sev} ({cnt})
            </button>
          );
        })}
      </div>

      {/* Error state — structured */}
      {error && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 16,
          background: 'var(--color-critical-bg)', border: '1px solid var(--color-critical-border)',
          borderRadius: 'var(--radius)', padding: '12px 14px',
        }}>
          <IconX size={14} />
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-critical)' }}>Failed to load findings</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>{error}</div>
          </div>
        </div>
      )}

      {loading ? (
        /* Loading state — spinner */
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--color-text-muted)', fontSize: 13, padding: '24px 0' }}>
          <span className="spinner" />
          Loading findings…
        </div>
      ) : filtered.length === 0 ? (
        /* Empty state — SVG icon, no emoji */
        <div style={{
          textAlign: 'center', padding: '48px 24px',
          background: 'var(--color-surface)', border: '1px dashed var(--color-border)',
          borderRadius: 'var(--radius-lg)', color: 'var(--color-text-muted)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10, color: 'var(--color-pass)' }}>
            <IconCheck size={32} />
          </div>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4, color: 'var(--color-pass)' }}>
            {findings.length === 0 ? 'No findings detected' : 'No findings match this filter'}
          </div>
          <p style={{ fontSize: 13 }}>
            {findings.length === 0
              ? 'The project looks clean!'
              : 'Try a different category or severity filter.'}
          </p>
        </div>
      ) : (
        <div>
          {filtered.map(finding => (
            <FindingCard
              key={finding.id}
              finding={finding}
              onRemediate={handleRemediate}
              remediating={remediating === finding.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
