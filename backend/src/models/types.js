/**
 * @fileoverview Shared data model definitions (JSDoc) for DevFlow AI.
 * These are documentation types — not runtime classes.
 */

/**
 * @typedef {'pending' | 'running' | 'completed' | 'failed'} SessionStatus
 */

/**
 * @typedef {'code-health' | 'test-health' | 'documentation' | 'configuration' | 'build-release'} FindingCategory
 */

/**
 * @typedef {'critical' | 'high' | 'medium' | 'low' | 'info'} Severity
 */

/**
 * @typedef {'open' | 'fixed' | 'wont-fix'} FindingStatus
 */

/**
 * @typedef {'low' | 'medium' | 'high'} Effort
 */

/**
 * @typedef {Object} ModuleTiming
 * @property {number} startedAt - epoch ms
 * @property {number} completedAt - epoch ms
 * @property {number} durationMs
 */

/**
 * @typedef {Object} AnalysisSession
 * @property {string} id - UUID
 * @property {string} projectId
 * @property {string} projectPath - validated absolute path
 * @property {string} projectName
 * @property {SessionStatus} status
 * @property {number} startedAt - epoch ms
 * @property {number|null} completedAt - epoch ms
 * @property {number} runNumber - 1 = initial, 2+ = re-analysis
 * @property {string|null} parentSessionId - set on re-analysis
 * @property {Object.<string, SessionStatus>} moduleStatuses
 * @property {Object.<string, ModuleTiming>} moduleTimings
 * @property {number} totalDurationMs
 * @property {string|null} error
 */

/**
 * @typedef {Object} Finding
 * @property {string} id - UUID
 * @property {string} analysisId
 * @property {FindingCategory} category
 * @property {Severity} severity
 * @property {string} title
 * @property {string} explanation
 * @property {string|null} affectedFile - relative path
 * @property {number|null} affectedLine
 * @property {string|null} evidence - truncated snippet, no secrets
 * @property {string} recommendation
 * @property {boolean} remediable
 * @property {string|null} remediationId
 * @property {FindingStatus} status
 */

/**
 * @typedef {Object} ActionPlanItem
 * @property {string} id - UUID
 * @property {string} analysisId
 * @property {number} priority - 1 = highest
 * @property {string[]} findingIds
 * @property {string} title
 * @property {string} rationale
 * @property {Effort} effort
 * @property {boolean} automated
 * @property {Severity} severity - highest severity among linked findings
 */

/**
 * @typedef {Object} WorkflowStep
 * @property {string} step
 * @property {number} durationMs
 * @property {number} startedAt - epoch ms
 */

/**
 * @typedef {Object} BeforeAfter
 * @property {number} run1FindingCount
 * @property {number} run2FindingCount
 * @property {number} fixedCount
 * @property {number} remainingCount
 */

/**
 * @typedef {Object} CategoryResult
 * @property {string} category
 * @property {'pass' | 'warn' | 'fail'} status
 * @property {number} findingCount
 * @property {string} summary
 */

/**
 * @typedef {Object} ScoreSummary
 * @property {number} critical
 * @property {number} high
 * @property {number} medium
 * @property {number} low
 * @property {number} info
 * @property {number} total
 * @property {number} fixed
 */

/**
 * @typedef {Object} ReleaseReadinessReport
 * @property {string} analysisId
 * @property {number} generatedAt - epoch ms
 * @property {number} runNumber
 * @property {'ready' | 'needs-attention' | 'not-ready'} overallStatus
 * @property {ScoreSummary} scoreSummary
 * @property {CategoryResult[]} categoryResults
 * @property {BeforeAfter|null} beforeAfter
 * @property {WorkflowStep[]} workflowTimeline
 */

module.exports = {};
