const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { aggregate } = require('../src/engine/aggregator');
const { rankAll } = require('../src/engine/severityRanker');
const { buildActionPlan } = require('../src/engine/actionPlanBuilder');

// Helper to create a minimal finding
function makeFinding(overrides = {}) {
  return {
    id: overrides.id || 'test-id-1',
    analysisId: 'test-session',
    category: overrides.category || 'code-health',
    severity: overrides.severity || 'low',
    title: overrides.title || 'Test finding',
    explanation: 'Test explanation',
    affectedFile: overrides.affectedFile || 'src/app.js',
    affectedLine: overrides.affectedLine || null,
    evidence: null,
    recommendation: 'Fix it',
    remediable: overrides.remediable !== undefined ? overrides.remediable : false,
    remediationId: overrides.remediationId || null,
    status: overrides.status || 'open',
    _severityKey: overrides._severityKey || null,
  };
}

describe('Aggregator', () => {
  it('deduplicates findings with identical category/file/title', () => {
    const f1 = makeFinding({ id: 'a', title: 'Same issue' });
    const f2 = makeFinding({ id: 'b', title: 'Same issue' });
    const result = aggregate([f1, f2]);
    assert.strictEqual(result.length, 1);
  });

  it('keeps distinct findings', () => {
    const f1 = makeFinding({ id: 'a', title: 'Issue A' });
    const f2 = makeFinding({ id: 'b', title: 'Issue B' });
    const result = aggregate([f1, f2]);
    assert.strictEqual(result.length, 2);
  });

  it('consolidates multiple TODO markers in same file into one finding', () => {
    const f1 = makeFinding({ id: 'a', title: 'TODO marker', affectedLine: 5 });
    const f2 = makeFinding({ id: 'b', title: 'TODO marker', affectedLine: 12 });
    const f3 = makeFinding({ id: 'c', title: 'TODO marker', affectedLine: 30 });
    const result = aggregate([f1, f2, f3]);
    assert.strictEqual(result.length, 1);
    assert.ok(result[0].title.includes('3'));
  });

  it('keeps single TODO as-is without consolidation', () => {
    const f1 = makeFinding({ id: 'a', title: 'TODO marker', affectedLine: 5 });
    const result = aggregate([f1]);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].title, 'TODO marker');
  });
});

describe('SeverityRanker', () => {
  it('sorts critical findings first', () => {
    const findings = [
      makeFinding({ id: 'a', severity: 'low' }),
      makeFinding({ id: 'b', severity: 'critical', title: 'Critical issue' }),
      makeFinding({ id: 'c', severity: 'medium', title: 'Medium issue' }),
    ];
    const ranked = rankAll(findings);
    assert.strictEqual(ranked[0].severity, 'critical');
    assert.strictEqual(ranked[1].severity, 'medium');
    assert.strictEqual(ranked[2].severity, 'low');
  });

  it('applies severity override for _severityKey', () => {
    const f = makeFinding({ id: 'a', severity: 'low', _severityKey: 'test-failure' });
    const ranked = rankAll([f]);
    assert.strictEqual(ranked[0].severity, 'critical');
  });
});

describe('ActionPlanBuilder', () => {
  it('produces one item per severity+category group', () => {
    const findings = [
      makeFinding({ id: 'a', severity: 'high', category: 'test-health', title: 'A' }),
      makeFinding({ id: 'b', severity: 'high', category: 'test-health', title: 'B' }),
      makeFinding({ id: 'c', severity: 'low', category: 'configuration', title: 'C' }),
    ];
    const plan = buildActionPlan('test-session', findings);
    assert.strictEqual(plan.length, 2);
    assert.strictEqual(plan[0].severity, 'high');
    assert.strictEqual(plan[1].severity, 'low');
  });

  it('marks plan item automated when any finding is remediable', () => {
    const findings = [
      makeFinding({ id: 'a', severity: 'low', remediable: true }),
    ];
    const plan = buildActionPlan('test-session', findings);
    assert.strictEqual(plan[0].automated, true);
  });

  it('skips fixed findings', () => {
    const findings = [
      makeFinding({ id: 'a', severity: 'high', status: 'fixed', title: 'Fixed issue' }),
      makeFinding({ id: 'b', severity: 'low', title: 'Open issue' }),
    ];
    const plan = buildActionPlan('test-session', findings);
    assert.strictEqual(plan.length, 1);
    assert.strictEqual(plan[0].severity, 'low');
  });
});
