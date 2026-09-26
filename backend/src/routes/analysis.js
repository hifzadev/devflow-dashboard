const express = require('express');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const store = require('../store/analysisStore');
const orchestrator = require('../engine/orchestrator');

const router = express.Router();

// Registered sample projects (allowlist)
const SAMPLE_PROJECTS = [
  {
    id: 'items-api',
    name: 'Items API',
    description: 'A synthetic Node.js Express REST API with intentional development issues for demo purposes.',
    language: 'JavaScript / Node.js',
    path: path.resolve(__dirname, '../../../sample-project'),
  },
];

function getProjectById(id) {
  return SAMPLE_PROJECTS.find(p => p.id === id) || null;
}

/**
 * GET /api/projects
 * List available sample projects.
 */
router.get('/projects', (req, res) => {
  res.json(SAMPLE_PROJECTS.map(({ id, name, description, language }) => ({
    id, name, description, language,
  })));
});

/**
 * POST /api/analysis/start
 * Body: { projectId: string }
 * Start a new analysis session.
 */
router.post('/analysis/start', async (req, res) => {
  const { projectId } = req.body;

  if (!projectId) {
    return res.status(400).json({ error: 'projectId is required' });
  }

  const project = getProjectById(projectId);
  if (!project) {
    return res.status(404).json({ error: `Unknown projectId: ${projectId}` });
  }

  const session = store.createSession({
    id: uuidv4(),
    projectId: project.id,
    projectPath: project.path,
    projectName: project.name,
    status: 'pending',
    startedAt: Date.now(),
    completedAt: null,
    runNumber: 1,
    parentSessionId: null,
    moduleStatuses: {
      'code-health': 'pending',
      'test-health': 'pending',
      'documentation': 'pending',
      'configuration': 'pending',
      'build-release': 'pending',
    },
    moduleTimings: {},
    totalDurationMs: 0,
    error: null,
  });

  // Start analysis asynchronously
  orchestrator.runAnalysis(session.id).catch(err => {
    console.error(`[orchestrator] session ${session.id} failed:`, err.message);
    store.updateSession(session.id, { status: 'failed', error: err.message, completedAt: Date.now() });
  });

  res.status(202).json({ sessionId: session.id, status: session.status });
});

/**
 * GET /api/analysis/:id/status
 * Get current status of an analysis session.
 */
router.get('/analysis/:id/status', (req, res) => {
  const session = store.getSession(req.params.id);
  if (!session) return res.status(404).json({ error: 'Session not found' });

  res.json({
    sessionId: session.id,
    projectId: session.projectId,
    projectName: session.projectName,
    status: session.status,
    runNumber: session.runNumber,
    startedAt: session.startedAt,
    completedAt: session.completedAt,
    totalDurationMs: session.totalDurationMs,
    moduleStatuses: session.moduleStatuses,
    moduleTimings: session.moduleTimings,
    error: session.error,
  });
});

/**
 * POST /api/analysis/:id/reanalyze
 * Start a re-analysis of the same project (creates a new session linked to the parent).
 */
router.post('/analysis/:id/reanalyze', async (req, res) => {
  const parent = store.getSession(req.params.id);
  if (!parent) return res.status(404).json({ error: 'Parent session not found' });

  if (parent.status === 'running' || parent.status === 'pending') {
    return res.status(409).json({ error: 'Parent session is still running' });
  }

  const session = store.createSession({
    id: uuidv4(),
    projectId: parent.projectId,
    projectPath: parent.projectPath,
    projectName: parent.projectName,
    status: 'pending',
    startedAt: Date.now(),
    completedAt: null,
    runNumber: parent.runNumber + 1,
    parentSessionId: parent.id,
    moduleStatuses: {
      'code-health': 'pending',
      'test-health': 'pending',
      'documentation': 'pending',
      'configuration': 'pending',
      'build-release': 'pending',
    },
    moduleTimings: {},
    totalDurationMs: 0,
    error: null,
  });

  orchestrator.runAnalysis(session.id).catch(err => {
    console.error(`[orchestrator] session ${session.id} failed:`, err.message);
    store.updateSession(session.id, { status: 'failed', error: err.message, completedAt: Date.now() });
  });

  res.status(202).json({ sessionId: session.id, status: session.status });
});

module.exports = router;
module.exports.getProjectById = getProjectById;
