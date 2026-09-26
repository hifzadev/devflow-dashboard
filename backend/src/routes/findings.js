const express = require('express');
const store = require('../store/analysisStore');

const router = express.Router({ mergeParams: true });

/**
 * GET /api/analysis/:id/findings
 * Returns all findings for the given session.
 */
router.get('/', (req, res) => {
  const session = store.getSession(req.params.id);
  if (!session) return res.status(404).json({ error: 'Session not found' });

  const findings = store.getFindings(req.params.id);
  res.json({ sessionId: req.params.id, findings });
});

module.exports = router;
