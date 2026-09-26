/**
 * Aggregator — deduplicates and consolidates findings from all modules.
 */

const { v4: uuidv4 } = require('uuid');

/**
 * Aggregate findings: deduplicate by (category, affectedFile, title) and
 * consolidate multiple TODO/FIXME findings in the same file.
 *
 * @param {import('../models/types').Finding[]} allFindings
 * @returns {import('../models/types').Finding[]}
 */
function aggregate(allFindings) {
  const seen = new Map(); // key -> finding
  const todosByFile = new Map(); // affectedFile -> Finding[]

  for (const finding of allFindings) {
    // Group TODO/FIXME findings by file for consolidation
    if (
      finding.category === 'code-health' &&
      (finding.title.startsWith('TODO marker') || finding.title.startsWith('FIXME marker'))
    ) {
      const fileKey = finding.affectedFile || '__unknown__';
      if (!todosByFile.has(fileKey)) todosByFile.set(fileKey, []);
      todosByFile.get(fileKey).push(finding);
      continue;
    }

    // Deduplicate by (category, affectedFile, title)
    const key = `${finding.category}:${finding.affectedFile || ''}:${finding.title}`;
    if (!seen.has(key)) {
      seen.set(key, finding);
    }
    // If duplicate, keep the first one (they're identical)
  }

  const result = Array.from(seen.values());

  // Consolidate TODO/FIXME groups
  for (const [file, todos] of todosByFile.entries()) {
    if (todos.length === 1) {
      result.push(todos[0]);
    } else {
      // Merge into a single consolidated finding
      const lines = todos.map(t => t.affectedLine).filter(Boolean).sort((a, b) => a - b);
      const types = [...new Set(todos.map(t => t.title.split(' ')[0]))].join('/');
      const consolidated = {
        ...todos[0],
        id: uuidv4(),
        title: `${types} markers in ${file.split('/').pop() || file} (${todos.length} occurrences)`,
        explanation: `Found ${todos.length} ${types} comment markers in this file indicating incomplete or deferred work.`,
        affectedLine: lines[0] || null,
        evidence: todos
          .map(t => `line ${t.affectedLine}: ${t.evidence || ''}`)
          .join(' | ')
          .slice(0, 200),
        recommendation: `Review and resolve all ${types} markers before release. Address each item or create tracking issues.`,
      };
      result.push(consolidated);
    }
  }

  return result;
}

module.exports = { aggregate };
