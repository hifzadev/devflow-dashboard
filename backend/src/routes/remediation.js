const express = require('express');
const store = require('../store/analysisStore');
const remediator = require('../remediation/remediator');

const router = express.Router({ mergeParams: true });

/**
 * POST /api/analysis/:id/remediate
 * Body: { remediationId: string, findingId: string }
 */
router.post('/', async (req, res) => {
  const { remediationId, findingId } = req.body;

  if (!remediationId || !findingId) {
    return res.status(400).json({ error: 'remediationId and findingId are required' });
  }

  const session = store.getSession(req.params.id);
  if (!session) return res.status(404).json({ error: 'Session not found' });

  if (session.status !== 'completed') {
    return res.status(409).json({ error: 'Analysis must be completed before remediation' });
  }

  const findings = store.getFindings(req.params.id);
  const finding = findings.find(f => f.id === findingId);

  if (!finding) {
    return res.status(404).json({ error: 'Finding not found' });
  }

  if (finding.status === 'fixed') {
    return res.status(409).json({ error: 'Finding is already fixed' });
  }

  try {
    await remediator.apply(remediationId, session.projectPath);
    store.updateFindingStatus(req.params.id, findingId, 'fixed');
    res.json({ success: true, findingId, remediationId, message: 'Remediation applied successfully' });
  } catch (err) {
    if (err.code === 'UNKNOWN_REMEDIATION') {
      return res.status(400).json({ error: err.message });
    }
    if (err.code === 'PATH_VIOLATION') {
      return res.status(403).json({ error: err.message });
    }
    return res.status(500).json({ error: 'Remediation failed: ' + err.message });
  }
});

module.exports = router;
