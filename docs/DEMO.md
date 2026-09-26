# DevFlow AI — Demo Scenario

## Overview

This document describes the step-by-step hackathon demo scenario for DevFlow AI.
The demo takes approximately 5–8 minutes and covers the full end-to-end workflow.

## Pre-Demo Setup

1. Clone the repository
2. Run `npm run install:all` to install all dependencies
3. Run `npm start` to start backend (port 3001) and frontend (port 5173)
4. Open `http://localhost:5173` in a browser
5. Ensure the `sample-project/` directory is in its **original unmodified state**
   (no `.gitignore`, no `.env.example`, original `package.json` without description/engines)

## Demo Steps

### Step 1 — Dashboard (30 seconds)

Open the Dashboard. Show:
- The "Items API" sample project card (synthetic project for demo purposes)
- The **Before/After Workflow** panel:
  - Left side: "Manual Workflow" — 7 isolated manual steps a developer would perform
  - Right side: "DevFlow Workflow" — one coordinated automated analysis
- Click **"Start Analysis"**

**Talking point:** "Instead of context-switching between terminal windows, editors, and documentation,
a developer clicks one button. DevFlow coordinates all checks in a structured workflow."

### Step 2 — Analysis Progress (60–90 seconds)

Watch the Analysis Progress page:
- Five module status indicators update in real time: pending → running → completed
- Elapsed time counter shows actual wall-clock time
- Each module completes and records its duration

**Talking point:** "Five independent checks run in a coordinated sequence. The orchestrator
records the actual time taken for each step — this is real data, not an estimate."

### Step 3 — Findings (60 seconds)

Navigate to Findings:
- Show all findings grouped by category
- Filter to **Critical** — show the failing test finding
- Filter to **Code Health** — show the async handler without try/catch, TODO markers
- Show a finding card in full: title, severity, affected file, evidence snippet, explanation, recommendation

**Talking point:** "13 issues detected across 5 categories. Each finding shows exactly where the
problem is, what the evidence is, and what to do about it. No manual grep required."

### Step 4 — Action Plan (60 seconds)

Navigate to Action Plan:
- Show the prioritized numbered list (critical items first)
- Point out that 4 items are marked "Automated" — they can be fixed with one click
- Click **"Apply Fix"** on the `.gitignore` finding
- Click **"Apply Fix"** on the `.env.example` finding
- Click **"Apply Fix"** on the `package.json description` finding

**Talking point:** "The action plan is ranked by severity and business impact. For safe,
mechanical fixes DevFlow applies them directly. For logic and code issues, it provides
the exact recommendation — the developer still owns the code."

### Step 5 — Re-Analysis (60 seconds)

Click **"Re-analyze"**:
- Watch the second analysis run (should be faster — npm dependencies already installed)
- Navigate back to Findings — confirm the 3 fixed findings now show "Fixed" status
- Overall finding count reduced from 13 to 10

**Talking point:** "After remediation, one click re-runs the full analysis. The new run
picks up the changes and the report shows what improved."

### Step 6 — Release Readiness Report (60 seconds)

Navigate to the Report:
- Show the overall status banner
- Show the **Score Summary**: finding counts by severity (run 2)
- Show the **Category Results** table — which categories are clear vs still have issues
- Show the **Workflow Timeline**: each step with its actual recorded duration in milliseconds
- Show the **Before vs After**: Run 1 (13 findings) → Run 2 (10 findings), 3 fixed

**Talking point:** "The report shows exactly what was found, what was fixed, and what remains.
The Workflow Timeline is real wall-clock data from this analysis run — not benchmarks.
This is the unified record a developer can share with their team before merging or releasing."

## Key Points to Emphasize

1. **No invented numbers** — all timing data and finding counts are from the actual demo run
2. **IBM Bob was central** — Plan mode produced the architecture before code was written;
   Agent mode implemented each sub-task; parallel subagents reviewed components independently
3. **Modular design** — each analysis module is an independent file; adding a new language
   means adding one new module file without touching existing code
4. **Security conscious** — project path validated; no secrets exposed; command allowlist enforced

## Resetting the Demo

To restore the sample project to its pre-remediation state after the demo:

```bash
# Remove files created by remediations
Remove-Item sample-project/.gitignore -ErrorAction SilentlyContinue
Remove-Item sample-project/.env.example -ErrorAction SilentlyContinue

# Restore original package.json (no description, no engines field)
# Use git to restore:
git checkout -- sample-project/package.json
```

Or simply restart — the in-memory store resets on backend restart.
The sample project source files are not modified by any remediation.
