/**
 * Action Plan Builder — groups and prioritises findings into actionable plan items.
 */

const { v4: uuidv4 } = require('uuid');
const { SEVERITY_ORDER } = require('./severityRanker');

/** Effort heuristics by category */
const EFFORT_MAP = {
  'build-release': 'high',
  'test-health': 'high',
  'code-health': 'medium',
  'documentation': 'low',
  'configuration': 'low',
};

/**
 * Build a prioritised action plan from aggregated, ranked findings.
 * @param {string} analysisId
 * @param {import('../models/types').Finding[]} findings
 * @returns {import('../models/types').ActionPlanItem[]}
 */
function buildActionPlan(analysisId, findings) {
  // Group by category + severity
  const groups = new Map();

  for (const finding of findings) {
    if (finding.status === 'fixed') continue;
    const key = `${finding.severity}:${finding.category}`;
    if (!groups.has(key)) {
      groups.set(key, { severity: finding.severity, category: finding.category, findings: [] });
    }
    groups.get(key).findings.push(finding);
  }

  // Sort groups by severity then category
  const sortedGroups = Array.from(groups.values()).sort((a, b) => {
    const si = SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity);
    if (si !== 0) return si;
    return a.category.localeCompare(b.category);
  });

  const plan = [];
  let priority = 1;

  for (const group of sortedGroups) {
    const { severity, category, findings: groupFindings } = group;
    const automated = groupFindings.some(f => f.remediable);
    const categoryLabel = category.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const severityLabel = severity.charAt(0).toUpperCase() + severity.slice(1);

    const titles = [...new Set(groupFindings.map(f => f.title))];
    const title = titles.length === 1
      ? titles[0]
      : `${severityLabel} ${categoryLabel} issues (${groupFindings.length})`;

    plan.push({
      id: uuidv4(),
      analysisId,
      priority: priority++,
      findingIds: groupFindings.map(f => f.id),
      title,
      rationale: buildRationale(severity, category, groupFindings),
      effort: EFFORT_MAP[category] || 'medium',
      automated,
      severity,
    });
  }

  return plan;
}

function buildRationale(severity, category, findings) {
  const count = findings.length;
  const noun = count === 1 ? 'issue' : 'issues';

  const rationaleMap = {
    'build-release': `${count} build/release ${noun} detected. These must be resolved before shipping.`,
    'test-health': `${count} test health ${noun} detected. Failing or missing tests indicate untested behaviour.`,
    'code-health': `${count} code health ${noun} in the ${severity} range. Address before the next release to reduce technical debt.`,
    'documentation': `${count} documentation ${noun}. Clear documentation reduces onboarding friction and support burden.`,
    'configuration': `${count} configuration ${noun}. Correct project configuration is required for reproducible builds and safe deployments.`,
  };

  return rationaleMap[category] || `${count} ${noun} detected in the ${severity} severity range.`;
}

module.exports = { buildActionPlan };
