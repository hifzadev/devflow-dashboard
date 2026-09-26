/**
 * Analysis Orchestrator
 * Runs all five analysis modules in sequence, aggregates findings,
 * applies severity ranking, builds the action plan and report.
 */

const store = require('../store/analysisStore');
const { aggregate } = require('./aggregator');
const { rankAll } = require('./severityRanker');
const { buildActionPlan } = require('./actionPlanBuilder');
const { buildReport } = require('./reportBuilder');

const codeHealth = require('../modules/codeHealth');
const testHealth = require('../modules/testHealth');
const documentation = require('../modules/documentation');
const configuration = require('../modules/configuration');
const buildRelease = require('../modules/buildRelease');

const MODULES = [
  { key: 'code-health', name: 'Code Health', fn: codeHealth.analyze },
  { key: 'test-health', name: 'Test Health', fn: testHealth.analyze },
  { key: 'documentation', name: 'Documentation', fn: documentation.analyze },
  { key: 'configuration', name: 'Configuration', fn: configuration.analyze },
  { key: 'build-release', name: 'Build / Release Readiness', fn: buildRelease.analyze },
];

/**
 * Run the full analysis pipeline for a session.
 * @param {string} sessionId
 */
async function runAnalysis(sessionId) {
  const session = store.getSession(sessionId);
  if (!session) throw new Error(`Session not found: ${sessionId}`);

  store.updateSession(sessionId, { status: 'running' });

  const allFindings = [];
  const moduleTimings = {};
  const workflowStart = Date.now();

  for (const mod of MODULES) {
    const modStart = Date.now();

    // Mark module as running
    store.updateSession(sessionId, {
      moduleStatuses: {
        ...store.getSession(sessionId).moduleStatuses,
        [mod.key]: 'running',
      },
    });

    let modFindings = [];
    try {
      modFindings = await mod.fn(session.projectPath);
      // Tag all findings with analysisId
      modFindings = modFindings.map(f => ({ ...f, analysisId: sessionId }));

      const modEnd = Date.now();
      moduleTimings[mod.key] = {
        startedAt: modStart,
        completedAt: modEnd,
        durationMs: modEnd - modStart,
      };

      store.updateSession(sessionId, {
        moduleStatuses: {
          ...store.getSession(sessionId).moduleStatuses,
          [mod.key]: 'completed',
        },
        moduleTimings: { ...store.getSession(sessionId).moduleTimings, ...moduleTimings },
      });
    } catch (err) {
      console.error(`[orchestrator] Module ${mod.key} failed:`, err.message);
      const modEnd = Date.now();
      moduleTimings[mod.key] = { startedAt: modStart, completedAt: modEnd, durationMs: modEnd - modStart };

      store.updateSession(sessionId, {
        moduleStatuses: {
          ...store.getSession(sessionId).moduleStatuses,
          [mod.key]: 'failed',
        },
        moduleTimings: { ...store.getSession(sessionId).moduleTimings, ...moduleTimings },
      });
      // Continue with other modules rather than aborting the whole run
    }

    allFindings.push(...modFindings);
  }

  // Aggregate + deduplicate
  const aggregated = aggregate(allFindings);

  // Apply severity ranking and sort
  const ranked = rankAll(aggregated);

  // Persist findings
  store.setFindings(sessionId, ranked);

  // Build action plan
  const actionPlan = buildActionPlan(sessionId, ranked);
  store.setActionPlan(sessionId, actionPlan);

  // Resolve parent session data for before/after comparison
  const currentSession = store.getSession(sessionId);
  let parentSession = null;
  let parentFindings = null;
  if (currentSession.parentSessionId) {
    parentSession = store.getSession(currentSession.parentSessionId);
    parentFindings = store.getFindings(currentSession.parentSessionId);
  }

  // Build report
  const totalDurationMs = Date.now() - workflowStart;
  store.updateSession(sessionId, { moduleTimings, totalDurationMs });

  const finalSession = store.getSession(sessionId);
  const report = buildReport(finalSession, ranked, parentSession, parentFindings);
  store.setReport(sessionId, report);

  // Mark complete
  store.updateSession(sessionId, {
    status: 'completed',
    completedAt: Date.now(),
    totalDurationMs,
    moduleTimings,
  });

  console.log(`[orchestrator] session ${sessionId} completed in ${totalDurationMs}ms — ${ranked.length} findings`);
}

module.exports = { runAnalysis };
