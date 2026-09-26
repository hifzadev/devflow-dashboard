/**
 * Report Builder — generates the final Release Readiness Report.
 */

const { SEVERITY_ORDER } = require('./severityRanker');

const CATEGORIES = ['code-health', 'test-health', 'documentation', 'configuration', 'build-release'];

/**
 * @param {import('../models/types').AnalysisSession} session
 * @param {import('../models/types').Finding[]} findings
 * @param {import('../models/types').AnalysisSession|null} parentSession
 * @param {import('../models/types').Finding[]|null} parentFindings
 * @returns {import('../models/types').ReleaseReadinessReport}
 */
function buildReport(session, findings, parentSession, parentFindings) {
  const scoreSummary = {
    critical: 0, high: 0, medium: 0, low: 0, info: 0,
    total: 0, fixed: 0,
  };

  for (const f of findings) {
    if (f.status === 'fixed') {
      scoreSummary.fixed++;
    } else {
      scoreSummary[f.severity] = (scoreSummary[f.severity] || 0) + 1;
      scoreSummary.total++;
    }
  }

  // Category results
  const categoryResults = CATEGORIES.map(cat => {
    const catFindings = findings.filter(f => f.category === cat && f.status !== 'fixed');
    const hasCritical = catFindings.some(f => f.severity === 'critical');
    const hasHigh = catFindings.some(f => f.severity === 'high');

    let status = 'pass';
    if (hasCritical) status = 'fail';
    else if (hasHigh || catFindings.length > 0) status = 'warn';

    return {
      category: cat,
      label: cat.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      status,
      findingCount: catFindings.length,
      summary: buildCategorySummary(cat, catFindings),
    };
  });

  // Overall status
  let overallStatus = 'ready';
  if (scoreSummary.critical > 0) overallStatus = 'not-ready';
  else if (scoreSummary.high > 0 || scoreSummary.medium > 0) overallStatus = 'needs-attention';

  // Workflow timeline from module timings
  const workflowTimeline = Object.entries(session.moduleTimings || {}).map(([step, timing]) => ({
    step,
    durationMs: timing.durationMs,
    startedAt: timing.startedAt,
  }));

  // Before/After (only on re-analysis)
  let beforeAfter = null;
  if (parentSession && parentFindings) {
    const run1Total = parentFindings.filter(f => f.status !== 'fixed').length;
    const run2Total = findings.filter(f => f.status !== 'fixed').length;
    const fixedCount = parentFindings.filter(f => f.status === 'fixed').length;

    beforeAfter = {
      run1FindingCount: parentFindings.length,
      run2FindingCount: findings.length,
      fixedCount,
      remainingCount: run2Total,
    };
  }

  return {
    analysisId: session.id,
    generatedAt: Date.now(),
    runNumber: session.runNumber,
    overallStatus,
    scoreSummary,
    categoryResults,
    beforeAfter,
    workflowTimeline,
  };
}

function buildCategorySummary(category, findings) {
  if (findings.length === 0) return 'No issues found.';
  const critCount = findings.filter(f => f.severity === 'critical').length;
  const highCount = findings.filter(f => f.severity === 'high').length;
  const parts = [];
  if (critCount > 0) parts.push(`${critCount} critical`);
  if (highCount > 0) parts.push(`${highCount} high`);
  const rest = findings.length - critCount - highCount;
  if (rest > 0) parts.push(`${rest} other`);
  return `${findings.length} issue${findings.length !== 1 ? 's' : ''}: ${parts.join(', ')}.`;
}

module.exports = { buildReport };
