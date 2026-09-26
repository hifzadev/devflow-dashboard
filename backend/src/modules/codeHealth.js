/**
 * Code Health Analysis Module
 * Scans JS source files for: TODO/FIXME markers, async without try/catch,
 * console.log in production paths, long functions, duplicated code blocks.
 */

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const MAX_EVIDENCE = 200;
const LONG_FUNCTION_THRESHOLD = 50; // lines

/**
 * @param {string} projectPath
 * @returns {Promise<import('../models/types').Finding[]>}
 */
async function analyze(projectPath) {
  const findings = [];
  const srcDir = path.join(projectPath, 'src');

  if (!fs.existsSync(srcDir)) return findings;

  const jsFiles = collectJsFiles(srcDir);

  for (const filePath of jsFiles) {
    const relPath = path.relative(projectPath, filePath).replace(/\\/g, '/');
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    // 1. TODO / FIXME markers
    lines.forEach((line, idx) => {
      const todoMatch = line.match(/\/\/.*\bTODO\b[:\s]*(.*)/i);
      const fixmeMatch = line.match(/\/\/.*\bFIXME\b[:\s]*(.*)/i);

      if (todoMatch) {
        findings.push(makeFinding({
          category: 'code-health',
          severity: 'low',
          title: 'TODO marker',
          explanation: 'A TODO comment indicates incomplete or deferred work that should be addressed before release.',
          affectedFile: relPath,
          affectedLine: idx + 1,
          evidence: truncate(`line ${idx + 1}: ${line.trim()}`, MAX_EVIDENCE),
          recommendation: 'Resolve the TODO item or create a tracked issue. Remove the comment once addressed.',
          remediable: false,
          remediationId: null,
          _severityKey: 'todo-marker',
        }));
      }

      if (fixmeMatch) {
        findings.push(makeFinding({
          category: 'code-health',
          severity: 'medium',
          title: 'FIXME marker',
          explanation: 'A FIXME comment indicates a known bug or issue that has not been resolved.',
          affectedFile: relPath,
          affectedLine: idx + 1,
          evidence: truncate(`line ${idx + 1}: ${line.trim()}`, MAX_EVIDENCE),
          recommendation: 'Fix the identified issue or create a tracked bug. Remove the comment once resolved.',
          remediable: false,
          remediationId: null,
          _severityKey: 'fixme-marker',
        }));
      }
    });

    // 2. Async functions without try/catch
    detectAsyncWithoutTryCatch(content, lines, relPath, findings);

    // 3. console.log in non-test files
    if (!relPath.includes('test') && !relPath.includes('spec')) {
      lines.forEach((line, idx) => {
        if (/\bconsole\.log\s*\(/.test(line)) {
          findings.push(makeFinding({
            category: 'code-health',
            severity: 'low',
            title: 'console.log in production code',
            explanation: 'console.log statements left in production code produce noise in server logs and may leak internal state.',
            affectedFile: relPath,
            affectedLine: idx + 1,
            evidence: truncate(line.trim(), MAX_EVIDENCE),
            recommendation: 'Remove console.log statements or replace with a proper logging library.',
            remediable: false,
            remediationId: null,
            _severityKey: 'console-log-production',
          }));
        }
      });
    }

    // 4. Very long functions
    detectLongFunctions(content, lines, relPath, findings);

    // 5. Duplicated code blocks (simple heuristic)
    detectDuplicatedBlocks(content, relPath, findings);
  }

  return findings;
}

function detectAsyncWithoutTryCatch(content, lines, relPath, findings) {
  // Find async function/arrow definitions and check if their body contains try/catch
  const asyncFnRegex = /async\s+(?:function\s+\w+\s*)?\([^)]*\)\s*\{|router\.\w+\s*\([^,]+,\s*async\s*\([^)]*\)\s*=>\s*\{/g;
  let match;

  while ((match = asyncFnRegex.exec(content)) !== null) {
    const startIdx = match.index;
    const lineNum = content.slice(0, startIdx).split('\n').length;

    // Extract the function body (simple brace counting)
    const body = extractBraceBlock(content, startIdx + match[0].lastIndexOf('{'));

    if (body && !body.includes('try') && !body.includes('catch')) {
      const contextLine = lines[lineNum - 1] ? lines[lineNum - 1].trim() : '';
      findings.push(makeFinding({
        category: 'code-health',
        severity: 'high',
        title: 'async function without try/catch',
        explanation: 'An async function or route handler does not have a try/catch block. Unhandled rejections can crash the server or produce unexpected responses.',
        affectedFile: relPath,
        affectedLine: lineNum,
        evidence: truncate(contextLine, MAX_EVIDENCE),
        recommendation: 'Wrap the async function body in a try/catch block and handle errors appropriately.',
        remediable: false,
        remediationId: null,
        _severityKey: 'async-no-try-catch',
      }));
    }
  }
}

function detectLongFunctions(content, lines, relPath, findings) {
  const fnRegex = /(?:function\s+(\w+)\s*\([^)]*\)|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>)\s*\{/g;
  let match;

  while ((match = fnRegex.exec(content)) !== null) {
    const fnName = match[1] || match[2] || 'anonymous';
    const startLine = content.slice(0, match.index).split('\n').length;
    const body = extractBraceBlock(content, match.index + match[0].lastIndexOf('{'));

    if (body) {
      const bodyLines = body.split('\n').length;
      if (bodyLines > LONG_FUNCTION_THRESHOLD) {
        findings.push(makeFinding({
          category: 'code-health',
          severity: 'low',
          title: `Long function: ${fnName} (${bodyLines} lines)`,
          explanation: `Function "${fnName}" is ${bodyLines} lines long. Very long functions are harder to understand, test, and maintain.`,
          affectedFile: relPath,
          affectedLine: startLine,
          evidence: truncate(`function ${fnName} at line ${startLine}`, MAX_EVIDENCE),
          recommendation: 'Consider breaking this function into smaller, focused functions.',
          remediable: false,
          remediationId: null,
          _severityKey: 'long-function',
        }));
      }
    }
  }
}

function detectDuplicatedBlocks(content, relPath, findings) {
  // Simple heuristic: find identical blocks of 5+ consecutive non-trivial lines
  const lines = content.split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 10 && !l.startsWith('//') && !l.startsWith('*'));

  if (lines.length < 10) return;

  // Build n-grams of size 5 and look for duplicates
  const NGRAM_SIZE = 5;
  const seen = new Map();

  for (let i = 0; i <= lines.length - NGRAM_SIZE; i++) {
    const gram = lines.slice(i, i + NGRAM_SIZE).join('\n');
    if (seen.has(gram)) {
      findings.push(makeFinding({
        category: 'code-health',
        severity: 'medium',
        title: 'Duplicated code block detected',
        explanation: `A block of ${NGRAM_SIZE} or more consecutive lines appears more than once in this file, suggesting duplicated logic that could be extracted into a shared function.`,
        affectedFile: relPath,
        affectedLine: i + 1,
        evidence: truncate(lines.slice(i, i + 3).join(' | '), MAX_EVIDENCE),
        recommendation: 'Extract the duplicated logic into a shared helper function.',
        remediable: false,
        remediationId: null,
        _severityKey: 'duplicated-code-block',
      }));
      break; // One finding per file is enough
    }
    seen.set(gram, i);
  }
}

function extractBraceBlock(content, openBraceIdx) {
  let depth = 0;
  let start = -1;

  for (let i = openBraceIdx; i < content.length; i++) {
    if (content[i] === '{') {
      depth++;
      if (start === -1) start = i;
    } else if (content[i] === '}') {
      depth--;
      if (depth === 0 && start !== -1) {
        return content.slice(start, i + 1);
      }
    }
  }
  return null;
}

function collectJsFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectJsFiles(full));
    } else if (entry.name.endsWith('.js')) {
      results.push(full);
    }
  }
  return results;
}

function makeFinding(props) {
  return {
    id: uuidv4(),
    analysisId: null, // will be set by orchestrator
    status: 'open',
    ...props,
  };
}

function truncate(str, max) {
  if (!str) return null;
  return str.length > max ? str.slice(0, max) + '…' : str;
}

module.exports = { analyze };
