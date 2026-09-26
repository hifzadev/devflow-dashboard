/**
 * Test Health Analysis Module
 * Checks test coverage structure and runs npm test.
 */

const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { v4: uuidv4 } = require('uuid');

// On Windows, npm must be called as npm.cmd
const NPM = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const MAX_EVIDENCE = 200;

/**
 * @param {string} projectPath
 * @returns {Promise<import('../models/types').Finding[]>}
 */
async function analyze(projectPath) {
  const findings = [];

  // 1. Discover test files
  const testsDir = findTestsDir(projectPath);
  const srcDir = path.join(projectPath, 'src');

  if (!testsDir) {
    findings.push(makeFinding({
      category: 'test-health',
      severity: 'high',
      title: 'No test directory found',
      explanation: 'No tests/ or __tests__/ directory was found in the project. Tests are essential for verifying behaviour before release.',
      affectedFile: null,
      affectedLine: null,
      evidence: null,
      recommendation: 'Create a tests/ directory and add test files for your source modules.',
      remediable: false,
      remediationId: null,
      _severityKey: 'no-test-files',
    }));
    return findings;
  }

  // 2. Find source files with no corresponding test
  if (fs.existsSync(srcDir)) {
    const srcFiles = collectJsFiles(srcDir);
    const testFiles = collectJsFiles(testsDir);
    const testNames = testFiles.map(f => path.basename(f, '.js')
      .replace(/\.test$/, '').replace(/\.spec$/, ''));

    for (const srcFile of srcFiles) {
      const srcBase = path.basename(srcFile, '.js');
      const hasTest = testNames.some(t => t === srcBase || t.includes(srcBase));

      if (!hasTest) {
        const relPath = path.relative(projectPath, srcFile).replace(/\\/g, '/');
        findings.push(makeFinding({
          category: 'test-health',
          severity: 'high',
          title: `No test file for ${path.basename(srcFile)}`,
          explanation: `The source file "${relPath}" has no corresponding test file. Untested code increases the risk of undetected regressions.`,
          affectedFile: relPath,
          affectedLine: null,
          evidence: `Source file: ${relPath}`,
          recommendation: `Create a test file covering the public functions in ${path.basename(srcFile)}.`,
          remediable: false,
          remediationId: null,
          _severityKey: 'untested-source-file',
        }));
      }
    }
  }

  // 3. Run npm test and parse output
  const testResult = await runNpmTest(projectPath);

  if (testResult.exitCode !== 0) {
    findings.push(makeFinding({
      category: 'test-health',
      severity: 'critical',
      title: 'Test suite has failures',
      explanation: `npm test exited with code ${testResult.exitCode}. One or more tests are failing.`,
      affectedFile: null,
      affectedLine: null,
      evidence: truncate(testResult.stderr || testResult.stdout, MAX_EVIDENCE),
      recommendation: 'Fix all failing tests before releasing. Run npm test locally to inspect the failure details.',
      remediable: false,
      remediationId: null,
      _severityKey: 'test-failure',
    }));
  } else {
    // Tests pass — emit informational finding with counts
    const passMatch = testResult.stdout.match(/pass\s+(\d+)/i);
    const passCount = passMatch ? passMatch[1] : 'unknown';
    findings.push(makeFinding({
      category: 'test-health',
      severity: 'info',
      title: `Test suite passing (${passCount} tests passed)`,
      explanation: `All tests pass. ${passCount} test(s) executed successfully.`,
      affectedFile: null,
      affectedLine: null,
      evidence: truncate(testResult.stdout, MAX_EVIDENCE),
      recommendation: 'Continue maintaining test coverage as the project grows.',
      remediable: false,
      remediationId: null,
      _severityKey: null,
    }));
  }

  return findings;
}

function findTestsDir(projectPath) {
  const candidates = ['tests', '__tests__', 'test'];
  for (const name of candidates) {
    const dir = path.join(projectPath, name);
    if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) return dir;
  }
  return null;
}

function collectJsFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...collectJsFiles(full));
    else if (entry.name.endsWith('.js')) results.push(full);
  }
  return results;
}

function runNpmTest(projectPath) {
  const { exec } = require('child_process');
  return new Promise((resolve) => {
    // Use exec (shell) because npm.cmd requires shell on Windows.
    // Command is from a hardcoded allowlist — not user input.
    exec(`${NPM} test`, {
      cwd: projectPath,
      timeout: 30000,
      env: { ...process.env, CI: 'true' },
    }, (error, stdout, stderr) => {
      resolve({
        exitCode: error ? (error.code || 1) : 0,
        stdout: stdout || '',
        stderr: stderr || '',
      });
    });
  });
}

function makeFinding(props) {
  return { id: uuidv4(), analysisId: null, status: 'open', ...props };
}

function truncate(str, max) {
  if (!str) return null;
  return str.length > max ? str.slice(0, max) + '…' : str;
}

module.exports = { analyze };
