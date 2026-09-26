const express = require('express');
const store = require('../store/analysisStore');

const router = express.Router({ mergeParams: true });

/**
 * GET /api/analysis/:id/action-plan
 */
router.get('/', (req, res) => {
  const session = store.getSession(req.params.id);
  if (!session) return res.status(404).json({ error: 'Session not found' });

  const plan = store.getActionPlan(req.params.id);
  res.json({ sessionId: req.params.id, actionPlan: plan });
});

module.exports = router;
