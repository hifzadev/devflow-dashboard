# Changelog

All notable changes to DevFlow AI are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Vercel deployment configuration** — `vercel.json` routes `/api/*` to a
  serverless function (`api/index.js`) that wraps the existing Express app, so
  the SPA and the API are served from a single origin and no CORS preflight is
  needed in production. A `vercel-build` script installs all four packages and
  builds the frontend.
- **Environment variable templates** — `.env.example` at the root and in
  `frontend/`, both containing commented placeholders only.
- **Configurable CORS** — the backend accepts a `FRONTEND_URL` environment
  variable in addition to the two localhost origins, and allows credentialed
  requests. Requests without an `Origin` header are still permitted for
  command-line and server-to-server use.
- **Frontend resilience** — an `ErrorBoundary` wraps the app so a render error
  shows a recoverable message instead of a blank page, plus a `NotFoundPage`
  for unmatched routes.
- **Accessibility and SEO** — skip-to-content link, `main` landmark id, Open
  Graph and description meta tags, and `robots.txt`.
- **Responsive styles** — a mobile breakpoint and a loading spinner in
  `globals.css`.

### Changed

- `uuid` upgraded from v9 to v14 in the backend. The CommonJS
  `require('uuid')` call style is unaffected; verified that all backend modules
  still load and the test suite still passes.
- `frontend/public/_redirects` added for static hosts that support it. On
  Vercel the equivalent SPA fallback is declared in `vercel.json`.

### Known Issues

- Deployment is configured but has not been verified against a live Vercel
  deployment. The serverless function is capped at a 30 second duration, while
  a local analysis run takes roughly 14 seconds with `npm install` and
  `npm test` executing against the sample project. A cold start may exceed that
  budget.
- Serverless deployments bundle the project read-only, so the sample project
  must be present in the deployed bundle for the build/release module to run.
  This has not been confirmed on Vercel.

## [1.0.0] - 2026-09-26

First complete end-to-end release of DevFlow AI, built for the IBM Bob 2.0
Hackathon by team The7th Neo.

### Added

- **Analysis engine** — sequential orchestrator driving five independent
  analysis modules (code health, test health, documentation, configuration,
  build/release readiness), with real per-module wall-clock timings.
- **Finding pipeline** — aggregation with deduplication and consolidation,
  severity ranking, and generation of a prioritised action plan grouped by
  severity and category.
- **Release Readiness Report** — overall status, category breakdown, workflow
  timeline, and before/after comparison across re-analysis runs.
- **Auto-remediation** — four allowlisted, non-destructive fixes (add
  `.gitignore`, add `.env.example`, add `package.json` `description`, add
  `engines.node`), each validated against a `sample-project/`-only path
  allowlist. Unknown remediation IDs are rejected.
- **Re-analysis** — a second run compares against its parent so the effect of
  applied remediations is visible.
- **REST API** on port 3001 — health, projects, analysis start/status/findings/
  action-plan/report, remediate, reanalyze.
- **React + Vite SPA** on port 5173 — dashboard with before/after panel, live
  analysis progress, findings, action plan, and report pages.
- **Sample project** — synthetic "Items API" containing 13 deliberately seeded
  detectable defects plus one intentionally failing test assertion.
- **Backend unit tests** — 9 tests covering the aggregator, severity ranker and
  action plan builder.
- **Documentation** — README, architecture overview, analysis workflow, demo
  scenario, implementation plan, and contributing guide.

### Fixed

- npm could not be spawned on Windows, where it resolves to `npm.cmd`. Every
  `npm install` / `npm test` call failed with `ENOENT`, which the orchestrator
  incorrectly surfaced as two false critical findings against the target
  project. The binary is now selected per platform and executed with
  `shell: true`, which Node >=18.20 requires for `.cmd` scripts. Real command
  execution and real timing data now work on Windows.

### Changed

- Root `install:all` now installs all four packages, including
  `sample-project/`, which was previously skipped.
- npm is now invoked via `exec` with a command string built from hardcoded
  literals, replacing the `execFile` + `shell: true` approach. Same behaviour,
  but it no longer makes Node print a `DEP0190` deprecation warning on every
  analysis run.
- Documentation consolidated into `docs/`; added `CONTRIBUTING.md`,
  `CHANGELOG.md` and an MIT `LICENSE` to match the licence already stated in
  the README.
- Security documentation corrected: commands are restricted to a fixed
  allowlist with hardcoded arguments and no user-supplied input, but they *are*
  executed through a shell, because `npm` resolves to `npm.cmd` on Windows.
  The previous "no shell interpolation" claim no longer matched the code.

### Known Issues

- `sample-project/package-lock.json` gains an `engines` entry whenever the
  build/release module runs `npm install`. This is harmless and does not affect
  the seeded defects the analysis is meant to detect.
- Remediations have not yet been validated end-to-end across a re-analysis run.

[Unreleased]: https://github.com/Tauseef666-ctrl/ibm-bob-devflow/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/Tauseef666-ctrl/ibm-bob-devflow/releases/tag/v1.0.0
