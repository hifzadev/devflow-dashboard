import React, { useState } from 'react';
import { Routes, Route, useParams } from 'react-router-dom';
import { Header } from './components/layout/Header';
import { ErrorBoundary } from './components/layout/ErrorBoundary';
import { DashboardPage } from './pages/DashboardPage';
import { AnalysisPage } from './pages/AnalysisPage';
import { FindingsPage } from './pages/FindingsPage';
import { ActionPlanPage } from './pages/ActionPlanPage';
import { ReportPage } from './pages/ReportPage';
import { NotFoundPage } from './pages/NotFoundPage';

function AnalysisRoutes({ setActiveSession }) {
  const { id } = useParams();
  return (
    <Routes>
      <Route index element={<AnalysisPage sessionId={id} onSessionStart={setActiveSession} />} />
      <Route path="findings" element={<FindingsPage sessionId={id} />} />
      <Route path="action-plan" element={<ActionPlanPage sessionId={id} />} />
      <Route path="report" element={<ReportPage sessionId={id} />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default function App() {
  const [activeSession, setActiveSession] = useState(null);

  return (
    <ErrorBoundary>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <Header sessionId={activeSession} />
      <main id="main-content" style={{ flex: 1 }}>
        <Routes>
          <Route path="/" element={<DashboardPage onSessionStart={setActiveSession} />} />
          <Route
            path="/analysis/:id/*"
            element={<AnalysisRoutes setActiveSession={setActiveSession} />}
          />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      <footer style={{
        borderTop: '1px solid var(--color-border)',
        padding: 'var(--space-4) var(--space-6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: 'var(--font-size-xs)',
        color: 'var(--color-text-subtle)',
        background: 'var(--color-surface)',
      }}>
        <span>⚡ DevFlow AI — IBM Bob 2.0 Hackathon</span>
        <span>Built by The7th Neo</span>
      </footer>
    </ErrorBoundary>
  );
}
