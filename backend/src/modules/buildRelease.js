/**
 * Build / Release Readiness Module
 * Runs npm install and npm test, validates semver, checks build script.
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { v4: uuidv4 } = require('uuid');

// On Windows, npm must be invoked via shell. Use exec with hardcoded allowlist commands.
const NPM = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const MAX_EVIDENCE = 200;

// Simple semver pattern (major.minor.patch with optional pre-release)
const SEMVER_RE = /^\d+\.\d+\.\d+(-[a-zA-Z0-9._-]+)?(\+[a-zA-Z0-9._-]+)?$/;

/**
 * @param {string} projectPath
 * @returns {Promise<import('../models/types').Finding[]>}
 */
async function analyze(projectPath) {
  const findings = [];

  const pkgPath = path.join(projectPath, 'package.json');
  if (!fs.existsSync(pkgPath)) return findings;

  let pkg;
  try {
    pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  } catch {
    return findings; // configuration module handles this
  }

  // 1. Validate version is valid semver
  if (!pkg.version) {
    findings.push(makeFinding({
      category: 'build-release',
      severity: 'high',
      title: 'package.json missing "version" field',
      explanation: 'No version field is present. A version is required for release tracking and package publishing.',
      affectedFile: 'package.json',
      evidence: null,
      recommendation: 'Add a version field using semver format, e.g. "version": "1.0.0".',
      remediable: false,
      remediationId: null,
      _severityKey: null,
    }));
  } else if (!SEMVER_RE.test(pkg.version)) {
    findings.push(makeFinding({
      category: 'build-release',
      severity: 'medium',
      title: `Invalid semver version: "${pkg.version}"`,
      explanation: `The version field "${pkg.version}" does not conform to semantic versioning (major.minor.patch).`,
      affectedFile: 'package.json',
      evidence: `version: "${pkg.version}"`,
      recommendation: 'Set the version to a valid semver string, e.g. "1.0.0".',
      remediable: false,
      remediationId: null,
      _severityKey: null,
    }));
  }

  // 2. Run npm install (timed)
  const installResult = await runCommand(NPM, ['install', '--prefer-offline'], projectPath, 60000);

  if (installResult.exitCode !== 0) {
    findings.push(makeFinding({
      category: 'build-release',
      severity: 'critical',
      title: 'npm install failed',
      explanation: 'npm install did not complete successfully. Dependencies cannot be resolved.',
      affectedFile: 'package.json',
      evidence: truncate(installResult.stderr || installResult.stdout, MAX_EVIDENCE),
      recommendation: 'Fix dependency resolution errors. Check package.json and npm-shrinkwrap/package-lock files.',
      remediable: false,
      remediationId: null,
      _severityKey: 'npm-install-failed',
    }));
    return findings; // No point running tests if install failed
  }

  // 3. Run npm test (timed, re-use result from testHealth if available — but we run independently for timing)
  const testResult = await runCommand(NPM, ['test'], projectPath, 60000);

  if (testResult.exitCode !== 0) {
    findings.push(makeFinding({
      category: 'build-release',
      severity: 'critical',
      title: 'npm test failed — project is not release-ready',
      explanation: `npm test exited with code ${testResult.exitCode}. A project with failing tests should not be released.`,
      affectedFile: null,
      evidence: truncate(testResult.stderr || testResult.stdout, MAX_EVIDENCE),
      recommendation: 'Fix all failing tests. Run npm test locally to see the full failure output.',
      remediable: false,
      remediationId: null,
      _severityKey: 'npm-test-failed',
    }));
  } else {
    findings.push(makeFinding({
      category: 'build-release',
      severity: 'info',
      title: `npm install and npm test completed successfully`,
      explanation: `Dependencies installed in ${installResult.durationMs}ms. Tests passed in ${testResult.durationMs}ms.`,
      affectedFile: null,
      evidence: `install: ${installResult.durationMs}ms | test: ${testResult.durationMs}ms`,
      recommendation: 'Continue verifying that all pre-release checks pass in CI.',
      remediable: false,
      remediationId: null,
      _severityKey: null,
    }));
  }

  // 4. Check if a build script exists and run it if so
  if (pkg.scripts && pkg.scripts.build) {
    const buildResult = await runCommand(NPM, ['run', 'build'], projectPath, 120000);
    if (buildResult.exitCode !== 0) {
      findings.push(makeFinding({
        category: 'build-release',
        severity: 'high',
        title: 'npm run build failed',
        explanation: 'A build script is defined but it failed to complete successfully.',
        affectedFile: null,
        evidence: truncate(buildResult.stderr || buildResult.stdout, MAX_EVIDENCE),
        recommendation: 'Fix the build script errors before releasing.',
        remediable: false,
        remediationId: null,
        _severityKey: null,
      }));
    }
  }

  return findings;
}

function runCommand(cmd, args, cwd, timeout) {
  const start = Date.now();
  // cmd and args are from a hardcoded allowlist — not user input.
  const command = [cmd, ...args].join(' ');
  return new Promise((resolve) => {
    exec(command, {
      cwd,
      timeout,
      env: { ...process.env, CI: 'true' },
    }, (error, stdout, stderr) => {
      resolve({
        exitCode: error ? (error.code || 1) : 0,
        stdout: stdout || '',
        stderr: stderr || '',
        durationMs: Date.now() - start,
      });
    });
  });
}

function makeFinding(props) {
  return {
    id: uuidv4(),
    analysisId: null,
    affectedLine: null,
    status: 'open',
    ...props,
  };
}

function truncate(str, max) {
  if (!str) return null;
  return str.length > max ? str.slice(0, max) + '…' : str;
}

module.exports = { analyze };
