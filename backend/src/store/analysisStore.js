/**
 * In-memory store for analysis sessions and their associated data.
 * All state is lost on server restart — sufficient for demo purposes.
 */

/** @type {Map<string, import('../models/types').AnalysisSession>} */
const sessions = new Map();

/** @type {Map<string, import('../models/types').Finding[]>} */
const findings = new Map();

/** @type {Map<string, import('../models/types').ActionPlanItem[]>} */
const actionPlans = new Map();

/** @type {Map<string, import('../models/types').ReleaseReadinessReport>} */
const reports = new Map();

const store = {
  // Sessions
  createSession(session) {
    sessions.set(session.id, session);
    findings.set(session.id, []);
    actionPlans.set(session.id, []);
    return session;
  },

  getSession(id) {
    return sessions.get(id) || null;
  },

  updateSession(id, updates) {
    const session = sessions.get(id);
    if (!session) return null;
    const updated = { ...session, ...updates };
    sessions.set(id, updated);
    return updated;
  },

  listSessions() {
    return Array.from(sessions.values());
  },

  // Findings
  setFindings(analysisId, newFindings) {
    findings.set(analysisId, newFindings);
  },

  getFindings(analysisId) {
    return findings.get(analysisId) || [];
  },

  updateFindingStatus(analysisId, findingId, status) {
    const list = findings.get(analysisId) || [];
    const idx = list.findIndex(f => f.id === findingId);
    if (idx === -1) return false;
    list[idx] = { ...list[idx], status };
    findings.set(analysisId, list);
    return true;
  },

  // Action Plans
  setActionPlan(analysisId, plan) {
    actionPlans.set(analysisId, plan);
  },

  getActionPlan(analysisId) {
    return actionPlans.get(analysisId) || [];
  },

  // Reports
  setReport(analysisId, report) {
    reports.set(analysisId, report);
  },

  getReport(analysisId) {
    return reports.get(analysisId) || null;
  },
};

module.exports = store;
