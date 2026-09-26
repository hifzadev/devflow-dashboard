/**
 * Safe Remediation Module
 * Applies only allowlisted, reversible fixes to the target project.
 * All operations are restricted to the validated project path.
 */

const fs = require('fs');
const path = require('path');

/**
 * The allowlist of supported remediation operations.
 * Each entry defines the operation and which files it affects.
 */
const REMEDIATION_OPS = {
  'add-gitignore-node': addGitignoreNode,
  'add-env-example': addEnvExample,
  'add-pkg-description': addPkgDescription,
  'add-pkg-engines': addPkgEngines,
};

/**
 * Validate that the target path is within the allowed project root.
 * @param {string} targetPath
 * @param {string} projectPath
 */
function validatePath(targetPath, projectPath) {
  const resolved = path.resolve(targetPath);
  const allowed = path.resolve(projectPath);
  if (!resolved.startsWith(allowed + path.sep) && resolved !== allowed) {
    const err = new Error(`Path violation: "${resolved}" is outside the allowed project directory.`);
    err.code = 'PATH_VIOLATION';
    throw err;
  }
}

/**
 * Apply a remediation operation.
 * @param {string} remediationId
 * @param {string} projectPath - validated project root
 */
async function apply(remediationId, projectPath) {
  const op = REMEDIATION_OPS[remediationId];
  if (!op) {
    const err = new Error(`Unknown remediationId: "${remediationId}". Supported: ${Object.keys(REMEDIATION_OPS).join(', ')}`);
    err.code = 'UNKNOWN_REMEDIATION';
    throw err;
  }

  await op(projectPath);
}

// ─── Operations ────────────────────────────────────────────────────────────────

/**
 * Creates .gitignore with node_modules and .env entries.
 */
async function addGitignoreNode(projectPath) {
  const target = path.join(projectPath, '.gitignore');
  validatePath(target, projectPath);

  const content = [
    '# Node.js',
    'node_modules/',
    'npm-debug.log*',
    '',
    '# Environment files',
    '.env',
    '.env.local',
    '',
    '# Build output',
    'dist/',
    'build/',
  ].join('\n') + '\n';

  fs.writeFileSync(target, content, 'utf8');
}

/**
 * Creates .env.example from env var names found in source files.
 */
async function addEnvExample(projectPath) {
  const target = path.join(projectPath, '.env.example');
  validatePath(target, projectPath);

  // Scan source for process.env.VAR_NAME
  const srcDir = path.join(projectPath, 'src');
  const varNames = new Set();
  const envRegex = /process\.env\.([A-Z0-9_]+)/g;

  if (fs.existsSync(srcDir)) {
    const jsFiles = collectJsFiles(srcDir);
    for (const filePath of jsFiles) {
      validatePath(filePath, projectPath);
      const content = fs.readFileSync(filePath, 'utf8');
      let match;
      while ((match = envRegex.exec(content)) !== null) {
        varNames.add(match[1]);
      }
    }
  }

  const lines = ['# Environment variables required by this project', '# Copy this file to .env and fill in values', ''];
  for (const name of [...varNames].sort()) {
    lines.push(`${name}=`);
  }

  fs.writeFileSync(target, lines.join('\n') + '\n', 'utf8');
}

/**
 * Adds a placeholder description field to package.json.
 */
async function addPkgDescription(projectPath) {
  const target = path.join(projectPath, 'package.json');
  validatePath(target, projectPath);

  const pkg = JSON.parse(fs.readFileSync(target, 'utf8'));
  if (pkg.description) return; // already has one

  pkg.description = `${pkg.name || 'This project'} — add a description here`;
  fs.writeFileSync(target, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
}

/**
 * Adds engines.node field to package.json using the current Node.js version.
 */
async function addPkgEngines(projectPath) {
  const target = path.join(projectPath, 'package.json');
  validatePath(target, projectPath);

  const pkg = JSON.parse(fs.readFileSync(target, 'utf8'));
  if (pkg.engines && pkg.engines.node) return; // already set

  // Use current major version as minimum
  const nodeMajor = process.versions.node.split('.')[0];
  pkg.engines = pkg.engines || {};
  pkg.engines.node = `>=${nodeMajor}.0.0`;

  fs.writeFileSync(target, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

module.exports = { apply, REMEDIATION_OPS };
