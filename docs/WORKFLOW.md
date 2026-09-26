# DevFlow AI — Analysis Workflow

## Overview

DevFlow AI's analysis workflow is a coordinated, sequential pipeline of five independent modules.
Each module inspects a specific aspect of the target project, emits structured findings, and records
its execution time. The orchestrator runs each module, collects results, aggregates and deduplicates
findings, ranks by severity, builds the action plan, and finally generates the release readiness report.

## Pipeline Diagram

```
projectPath (validated)
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│                        Orchestrator                          │
│                                                             │
│  ┌────────────┐  ┌────────────┐  ┌─────────────────────┐   │
│  │ Code Health│  │Test Health │  │   Documentation      │   │
│  │  Module    │  │  Module    │  │      Module          │   │
│  └─────┬──────┘  └─────┬──────┘  └──────────┬──────────┘   │
│        │               │                    │               │
│  ┌─────────────┐  ┌────────────────────┐    │               │
│  │Configuration│  │ Build / Release    │    │               │
│  │   Module    │  │ Readiness Module   │    │               │
│  └──────┬──────┘  └─────────┬──────────┘    │               │
│         └──────────────┬────┘               │               │
│                        ▼                    │               │
│              ┌─────────────────┐            │               │
│              │   Aggregator    │◄───────────┘               │
│              │ (dedup + group) │                            │
│              └────────┬────────┘                            │
│                       │                                     │
│              ┌────────▼────────┐                            │
│              │ Severity Ranker │                            │
│              └────────┬────────┘                            │
│                       │                                     │
│         ┌─────────────┼─────────────┐                       │
│         ▼             ▼             ▼                       │
│  ┌─────────────┐ ┌─────────┐ ┌──────────────┐             │
│  │Action Plan  │ │Findings │ │Report Builder│             │
│  │  Builder    │ │  Store  │ │              │             │
│  └─────────────┘ └─────────┘ └──────────────┘             │
└─────────────────────────────────────────────────────────────┘
```

## Module Descriptions

### 1. Code Health
**File:** `backend/src/modules/codeHealth.js`

Scans all `.js` source files for:
- TODO and FIXME comment markers (file + line number extracted)
- `async` functions that have no `try/catch` block
- `console.log` statements outside of test files
- Functions exceeding 50 lines (maintainability concern)
- Near-identical code blocks (simple string-similarity heuristic)

### 2. Test Health
**File:** `backend/src/modules/testHealth.js`

- Discovers test files in `tests/` or `__tests__/` directories
- Identifies source files with no corresponding test file
- Runs `npm test` (allowlisted command, fixed argument array)
- Parses test output for pass/fail/error counts

### 3. Documentation
**File:** `backend/src/modules/documentation.js`

- Checks for `README.md` presence
- Checks README for installation/setup section (keyword heuristic)
- Scans source files for `process.env.` references; checks whether each variable name appears in README
- Checks for CHANGELOG or release notes

### 4. Configuration
**File:** `backend/src/modules/configuration.js`

- Validates required `package.json` fields: `name`, `version`, `description`, `license`
- Checks for `engines.node` field
- Detects `process.env.` usage and flags absence of `.env.example`
- Verifies `.gitignore` presence and that it includes `node_modules` and `.env`

### 5. Build / Release Readiness
**File:** `backend/src/modules/buildRelease.js`

- Validates `version` is a valid semver string
- Runs `npm install` (allowlisted, timed) to verify dependency resolution
- Runs `npm test` (allowlisted, timed) and records exit code
- Checks whether a `build` script is defined and runs it if present

## Aggregation and Deduplication

`backend/src/engine/aggregator.js`:
- Deduplicates findings with identical `(category, affectedFile, title)` tuples
- Groups multiple TODO/FIXME findings in the same file into one consolidated finding
- Merges test-failure findings from Test Health and Build/Release modules

## Severity Ranking

`backend/src/engine/severityRanker.js`:

| Finding Type | Severity |
|---|---|
| Test failure (exit code ≠ 0) | critical |
| npm install failure | critical |
| Async route handler without try/catch | high |
| Missing README | high |
| Source file with no test | high |
| Missing .env.example when env vars used | medium |
| Missing .gitignore | medium |
| Missing package.json description | low |
| TODO / FIXME marker | low |
| console.log in production | low |
| Missing engines field | low |
| Informational observation | info |

## Action Plan Builder

`backend/src/engine/actionPlanBuilder.js`:
- Groups findings by severity (critical first)
- Produces one `ActionPlanItem` per logical issue cluster
- Sets `automated: true` only where a safe remediator exists
- Sets `effort` based on finding type (low/medium/high)

## Remediation

`backend/src/remediation/remediator.js`:

Only four operations are supported, chosen for safety and reversibility:

| remediationId | Operation |
|---|---|
| `add-gitignore-node` | Creates `.gitignore` with `node_modules` and `.env` |
| `add-env-example` | Creates `.env.example` listing env var names found in source |
| `add-pkg-description` | Adds placeholder `description` to `package.json` |
| `add-pkg-engines` | Adds `engines.node` field to `package.json` |

All operations:
- Are restricted to the validated sample-project directory
- Create new files or edit single JSON fields only
- Do not delete files, modify logic, or execute arbitrary code

## Timing and Evidence

- The orchestrator records `Date.now()` before and after each module
- Durations are stored in `session.timing.moduleTimings`
- The final report exposes a `workflowTimeline` array with each step's actual duration
- All displayed timing values are real wall-clock measurements from the current analysis run

## Re-analysis

After remediations are applied, the developer can trigger a re-analysis via
`POST /api/analysis/:id/reanalyze`. This starts a new analysis session against the same
(now partially fixed) project. The report builder compares run 1 vs run 2 finding counts
and populates the `beforeAfter` section of the report.
