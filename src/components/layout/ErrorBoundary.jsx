import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info);
  }

  render() {
    if (this.state.hasError) {
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
          <div style={{ fontSize: 40, marginBottom: 'var(--space-4)' }}>⚠️</div>
          <h2 style={{ fontWeight: 700, marginBottom: 'var(--space-3)', color: 'var(--color-text)' }}>
            Something went wrong
          </h2>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-5)', maxWidth: 400 }}>
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <button
            className="btn-primary"
            onClick={() => { this.setState({ hasError: false, error: null }); window.location.href = '/'; }}
          >
            Back to Dashboard
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
