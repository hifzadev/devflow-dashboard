/**
 * Severity ranker — applies severity assignment rules to findings.
 * Modules emit a baseSeverity; this module can override based on finding type.
 */

/** @type {Record<string, import('../models/types').Severity>} */
const SEVERITY_OVERRIDES = {
  // Build/Release
  'npm-test-failed': 'critical',
  'npm-install-failed': 'critical',
  // Test Health
  'test-failure': 'critical',
  'no-test-files': 'high',
  'untested-source-file': 'high',
  // Documentation
  'missing-readme': 'high',
  'readme-no-setup': 'high',
  'missing-env-docs': 'medium',
  // Configuration
  'missing-gitignore': 'medium',
  'missing-env-example': 'medium',
  'missing-pkg-description': 'low',
  'missing-pkg-license': 'low',
  'missing-pkg-engines': 'low',
  // Code Health
  'async-no-try-catch': 'high',
  'todo-marker': 'low',
  'fixme-marker': 'medium',
  'console-log-production': 'low',
  'long-function': 'low',
  'duplicated-code-block': 'medium',
};

const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low', 'info'];

/**
 * Apply severity rules to a finding.
 * @param {import('../models/types').Finding} finding
 * @returns {import('../models/types').Finding}
 */
function rank(finding) {
  const override = SEVERITY_OVERRIDES[finding.remediationId] ||
                   SEVERITY_OVERRIDES[finding._severityKey];
  if (override) {
    return { ...finding, severity: override };
  }
  return finding;
}

/**
 * Apply severity ranking to all findings.
 * @param {import('../models/types').Finding[]} findings
 * @returns {import('../models/types').Finding[]}
 */
function rankAll(findings) {
  return findings.map(rank).sort((a, b) => {
    return SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity);
  });
}

module.exports = { rank, rankAll, SEVERITY_ORDER };
