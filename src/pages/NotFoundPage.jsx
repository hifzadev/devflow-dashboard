import React from 'react';
import { useNavigate } from 'react-router-dom';

export function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div style={{
      minHeight: '60vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 'var(--space-8)',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 48, marginBottom: 'var(--space-4)' }}>🔍</div>
      <h1 style={{ fontWeight: 800, fontSize: 'var(--font-size-2xl)', marginBottom: 'var(--space-3)', letterSpacing: '-0.03em' }}>
        404
      </h1>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-6)', fontSize: 'var(--font-size-md)' }}>
        Page not found. The analysis session may have expired.
      </p>
      <button className="btn-primary" onClick={() => navigate('/')}>
        Back to Dashboard
      </button>
    </div>
  );
}
