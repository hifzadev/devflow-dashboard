import React from 'react';

const SEVERITY_COLORS = {
  critical: 'badge-critical',
  high: 'badge-high',
  medium: 'badge-medium',
  low: 'badge-low',
  info: 'badge-info',
  fixed: 'badge-fixed',
};

const SEVERITY_LABELS = {
  critical: '● Critical',
  high: '▲ High',
  medium: '◆ Medium',
  low: '○ Low',
  info: '· Info',
  fixed: '✓ Fixed',
};

export function SeverityBadge({ severity, status }) {
  const display = status === 'fixed' ? 'fixed' : severity;
  return (
    <span className={`badge ${SEVERITY_COLORS[display] || 'badge-info'}`}>
      {SEVERITY_LABELS[display] || display}
    </span>
  );
}
