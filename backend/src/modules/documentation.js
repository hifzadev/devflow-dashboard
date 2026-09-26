/**
 * Documentation Analysis Module
 * Inspects README and docs for completeness gaps.
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

  // 1. Check README presence
  const readmePath = path.join(projectPath, 'README.md');
  const readmeAltPath = path.join(projectPath, 'README.txt');
  const hasReadme = fs.existsSync(readmePath) || fs.existsSync(readmeAltPath);

  if (!hasReadme) {
    findings.push(makeFinding({
      category: 'documentation',
      severity: 'high',
      title: 'README.md is missing',
      explanation: 'No README.md was found. A README is essential for onboarding developers and documenting setup, usage, and contribution.',
      affectedFile: null,
      affectedLine: null,
      evidence: null,
      recommendation: 'Create a README.md with at minimum: project description, installation instructions, and usage examples.',
      remediable: false,
      remediationId: null,
      _severityKey: 'missing-readme',
    }));
    return findings;
  }

  // 2. Inspect README content
  const readmeContent = fs.readFileSync(readmePath, 'utf8');
  const readmeLower = readmeContent.toLowerCase();

  // Check for setup/installation section
  const hasSetupSection = readmeLower.includes('install') ||
    readmeLower.includes('npm install') ||
    readmeLower.includes('setup') ||
    readmeLower.includes('getting started');

  if (!hasSetupSection) {
    findings.push(makeFinding({
      category: 'documentation',
      severity: 'high',
      title: 'README missing installation/setup instructions',
      explanation: 'The README does not appear to contain installation or setup instructions. Developers cloning this project will not know how to get it running.',
      affectedFile: 'README.md',
      affectedLine: null,
      evidence: truncate(readmeContent.slice(0, 100), MAX_EVIDENCE),
      recommendation: 'Add an "Installation" or "Getting Started" section with steps to install and run the project.',
      remediable: false,
      remediationId: null,
      _severityKey: 'readme-no-setup',
    }));
  }

  // 3. Check for environment variable documentation
  const envVarNames = collectEnvVarNames(projectPath);

  for (const varName of envVarNames) {
    if (!readmeContent.includes(varName)) {
      findings.push(makeFinding({
        category: 'documentation',
        severity: 'medium',
        title: `Environment variable ${varName} not documented in README`,
        explanation: `The environment variable "${varName}" is used in the source code but is not mentioned in the README. Developers will not know this configuration is required.`,
        affectedFile: 'README.md',
        affectedLine: null,
        evidence: `process.env.${varName} referenced in source code`,
        recommendation: `Add documentation for ${varName} to the README, including its purpose, whether it is required, and an example value.`,
        remediable: false,
        remediationId: null,
        _severityKey: 'missing-env-docs',
      }));
    }
  }

  // 4. Check for CHANGELOG
  const changelogPath = path.join(projectPath, 'CHANGELOG.md');
  const changelogAlt = path.join(projectPath, 'CHANGELOG');
  if (!fs.existsSync(changelogPath) && !fs.existsSync(changelogAlt)) {
    findings.push(makeFinding({
      category: 'documentation',
      severity: 'info',
      title: 'No CHANGELOG found',
      explanation: 'No CHANGELOG.md was found. A changelog communicates changes between releases to users and contributors.',
      affectedFile: null,
      affectedLine: null,
      evidence: null,
      recommendation: 'Consider adding a CHANGELOG.md following Keep a Changelog format (https://keepachangelog.com).',
      remediable: false,
      remediationId: null,
      _severityKey: null,
    }));
  }

  return findings;
}

/**
 * Scan JS source files for process.env.VAR_NAME references and return unique var names.
 * @param {string} projectPath
 * @returns {string[]}
 */
function collectEnvVarNames(projectPath) {
  const srcDir = path.join(projectPath, 'src');
  if (!fs.existsSync(srcDir)) return [];

  const jsFiles = collectJsFiles(srcDir);
  const varNames = new Set();
  const envRegex = /process\.env\.([A-Z0-9_]+)/g;

  for (const filePath of jsFiles) {
    const content = fs.readFileSync(filePath, 'utf8');
    let match;
    while ((match = envRegex.exec(content)) !== null) {
      varNames.add(match[1]);
    }
  }

  return Array.from(varNames);
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
  return { id: uuidv4(), analysisId: null, status: 'open', ...props };
}

function truncate(str, max) {
  if (!str) return null;
  return str.length > max ? str.slice(0, max) + '…' : str;
}

module.exports = { analyze };
