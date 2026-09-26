const express = require('express');
const store = require('../store/analysisStore');

const router = express.Router({ mergeParams: true });

/**
 * GET /api/analysis/:id/report
 */
router.get('/', (req, res) => {
  const session = store.getSession(req.params.id);
  if (!session) return res.status(404).json({ error: 'Session not found' });

  if (session.status !== 'completed') {
    return res.status(202).json({ message: 'Analysis not yet completed', status: session.status });
  }

  const report = store.getReport(req.params.id);
  if (!report) return res.status(404).json({ error: 'Report not found' });

  res.json(report);
});

module.exports = router;
