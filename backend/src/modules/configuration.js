/**
 * Configuration Analysis Module
 * Inspects package.json, .gitignore, and .env.example for completeness.
 */

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const MAX_EVIDENCE = 200;

/**
 * @param {string} projectPath
 * @returns {Promise<import('../models/types').Finding[]>}
 */
async function analyze(projectPath) {
  const findings = [];

  // 1. package.json checks
  const pkgPath = path.join(projectPath, 'package.json');
  if (!fs.existsSync(pkgPath)) {
    findings.push(makeFinding({
      category: 'configuration',
      severity: 'critical',
      title: 'package.json is missing',
      explanation: 'No package.json was found. This file is required for Node.js projects to declare dependencies, scripts, and metadata.',
      affectedFile: null,
      evidence: null,
      recommendation: 'Run npm init to create a package.json.',
      remediable: false,
      remediationId: null,
      _severityKey: null,
    }));
    return findings;
  }

  let pkg;
  try {
    pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  } catch (e) {
    findings.push(makeFinding({
      category: 'configuration',
      severity: 'critical',
      title: 'package.json is invalid JSON',
      explanation: 'package.json could not be parsed as valid JSON.',
      affectedFile: 'package.json',
      evidence: truncate(e.message, MAX_EVIDENCE),
      recommendation: 'Fix the JSON syntax error in package.json.',
      remediable: false,
      remediationId: null,
      _severityKey: null,
    }));
    return findings;
  }

  // Check required fields
  if (!pkg.description) {
    findings.push(makeFinding({
      category: 'configuration',
      severity: 'low',
      title: 'package.json missing "description" field',
      explanation: 'The description field is empty or missing. It helps identify the project in npm listings and tooling.',
      affectedFile: 'package.json',
      affectedLine: null,
      evidence: null,
      recommendation: 'Add a concise description of the project to package.json.',
      remediable: true,
      remediationId: 'add-pkg-description',
      _severityKey: 'missing-pkg-description',
    }));
  }

  if (!pkg.license) {
    findings.push(makeFinding({
      category: 'configuration',
      severity: 'low',
      title: 'package.json missing "license" field',
      explanation: 'No license is declared. For public or shared packages, a license is required to clarify usage rights.',
      affectedFile: 'package.json',
      affectedLine: null,
      evidence: null,
      recommendation: 'Add a "license" field to package.json (e.g. "MIT").',
      remediable: false,
      remediationId: null,
      _severityKey: 'missing-pkg-license',
    }));
  }

  if (!pkg.engines || !pkg.engines.node) {
    findings.push(makeFinding({
      category: 'configuration',
      severity: 'low',
      title: 'package.json missing "engines.node" field',
      explanation: 'No Node.js version requirement is specified. This can cause runtime issues when the project is run with an incompatible Node version.',
      affectedFile: 'package.json',
      affectedLine: null,
      evidence: null,
      recommendation: 'Add an "engines" field specifying the required Node.js version, e.g. "engines": { "node": ">=18.0.0" }.',
      remediable: true,
      remediationId: 'add-pkg-engines',
      _severityKey: 'missing-pkg-engines',
    }));
  }

  // 2. .gitignore checks
  const gitignorePath = path.join(projectPath, '.gitignore');
  if (!fs.existsSync(gitignorePath)) {
    findings.push(makeFinding({
      category: 'configuration',
      severity: 'medium',
      title: '.gitignore is missing',
      explanation: 'No .gitignore file was found. Without it, node_modules, .env files, and build artifacts may be accidentally committed.',
      affectedFile: null,
      affectedLine: null,
      evidence: null,
      recommendation: 'Add a .gitignore file that includes node_modules/ and .env at minimum.',
      remediable: true,
      remediationId: 'add-gitignore-node',
      _severityKey: 'missing-gitignore',
    }));
  } else {
    const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
    if (!gitignoreContent.includes('node_modules')) {
      findings.push(makeFinding({
        category: 'configuration',
        severity: 'medium',
        title: '.gitignore does not exclude node_modules',
        explanation: 'node_modules is not listed in .gitignore. Committing node_modules will bloat the repository.',
        affectedFile: '.gitignore',
        evidence: truncate(gitignoreContent.slice(0, 100), MAX_EVIDENCE),
        recommendation: 'Add node_modules to .gitignore.',
        remediable: false,
        remediationId: null,
        _severityKey: 'missing-gitignore',
      }));
    }
  }

  // 3. .env.example check — only if process.env usage detected in source
  const srcDir = path.join(projectPath, 'src');
  const usesEnvVars = srcDir && hasEnvVarUsage(srcDir);

  if (usesEnvVars) {
    const envExamplePath = path.join(projectPath, '.env.example');
    if (!fs.existsSync(envExamplePath)) {
      findings.push(makeFinding({
        category: 'configuration',
        severity: 'medium',
        title: '.env.example is missing',
        explanation: 'The project uses environment variables (process.env.*) but no .env.example file was found. New developers will not know which environment variables are required.',
        affectedFile: null,
        affectedLine: null,
        evidence: null,
        recommendation: 'Create a .env.example file listing all required environment variable names with placeholder values.',
        remediable: true,
        remediationId: 'add-env-example',
        _severityKey: 'missing-env-example',
      }));
    }
  }

  return findings;
}

function hasEnvVarUsage(srcDir) {
  if (!fs.existsSync(srcDir)) return false;
  const jsFiles = collectJsFiles(srcDir);
  for (const filePath of jsFiles) {
    const content = fs.readFileSync(filePath, 'utf8');
    if (/process\.env\.[A-Z0-9_]+/.test(content)) return true;
  }
  return false;
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
