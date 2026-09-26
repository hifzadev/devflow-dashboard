# Contributing to DevFlow AI

DevFlow AI is an IBM Bob 2.0 Hackathon project built by a three-person team.
This document describes how we work so that we can move quickly without
stepping on each other's changes.

## Team and Ownership

**Team: The7th Neo**

| Member | GitHub | Primary ownership |
|---|---|---|
| Tauseef (Team Lead) | `Tauseef666-ctrl` | Architecture, backend engine, Bob workflow, integration, final review, release |
| Hifza Irfan | — | `frontend/` — UI, pages, components, styling |
| Hamza Masood | — | `sample-project/`, QA, documentation |

Ownership means *primary* responsibility, not exclusivity. If a change genuinely
requires touching another area, say so in the PR description rather than
silently editing it.

## Repository Setup

```bash
git clone https://github.com/Tauseef666-ctrl/ibm-bob-devflow.git
cd ibm-bob-devflow
npm run install:all     # installs root, backend, frontend and sample-project
```

`npm run install:all` must be used rather than four separate `npm install`
calls — the analysis target `sample-project/` needs its own dependencies.

## Branches

`main` is the stable, demo-ready branch. **Do not commit experimental work
directly to `main`.**

| Prefix | Use for | Example |
|---|---|---|
| `feature/` | New functionality | `feature/frontend-dashboard` |
| `fix/` | Bug fixes | `fix/npm-exec-windows` |
| `docs/` | Documentation only | `docs/contributing-guide` |
| `refactor/` | Restructuring without behaviour change | `refactor/analysis-store` |

```bash
git checkout main && git pull
git checkout -b feature/my-change
```

## Development Workflow

1. Create a branch from an up-to-date `main`.
2. Make one coherent change. Keep unrelated changes out of the same commit.
3. Run the validation commands below.
4. Commit using Conventional Commits.
5. Push the branch and open a PR against `main`.
6. Another team member reviews before merge.

## Validation Before Committing

Run these from the repository root:

```bash
npm test          # backend unit tests - must be 9/9
npm run build     # frontend production build - must succeed
```

If your change touches the analysis modules, also confirm the end-to-end flow
still works: start the app with `npm start`, run an analysis against the
Items API sample project, and confirm the findings and report render.

`npm test --prefix sample-project` is **expected to report one failure**. That
failure is a deliberately seeded demo defect. Do not fix it.

## Commit Conventions

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>: <short imperative summary>
```

| Type | Use for |
|---|---|
| `feat` | New user-visible functionality |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `refactor` | No behaviour change |
| `test` | Adding or correcting tests |
| `chore` | Tooling, config, dependencies, repo housekeeping |

Good examples:

```
feat: add release readiness dashboard
fix: handle failed test analysis
docs: update setup instructions
refactor: simplify analysis result processing
chore: update project configuration
```

Avoid meaningless messages such as `update`, `changes`, `final`, `working`,
`stuff`, or `test123`. Each commit should represent exactly one coherent purpose
— a reviewer should be able to understand a change from the message and diff
alone.

## Pull Requests

Every PR description should contain:

- **Summary** — what and why, in one or two sentences
- **What changed** — files or areas touched
- **Why it changed** — the problem being solved
- **Testing performed** — exactly what you ran and the result. Do not claim
  tests you did not run.
- **Screenshots** — required for any UI change
- **Known limitations** — anything a reviewer should watch for
- **Related issue** — if one exists

Keep PRs small. A PR that changes unrelated things is hard to review and hard
to revert.

## Documentation Expectations

- If a change affects user-visible behaviour, update `README.md` in the same PR.
- Substantive technical detail belongs in `docs/`, not in the root directory.
- `CHANGELOG.md` is updated for milestones and notable fixes.
- **Never invent performance numbers or metrics.** Only report measurements you
  have actually taken, and say how they were collected. An honest "not
  measured" is better than an impressive estimate.

## Avoiding Conflicts

- `git pull` on `main` before starting new work each day.
- Commit small and often so integration stays cheap.
- Do not reformat or restructure files you are not otherwise changing — it makes
  merges painful for everyone.
- If you must change a file owned by another member, open an issue or ask first.
- If a merge conflict looks ambiguous, stop and ask rather than guessing.
  Never discard another member's work with `reset --hard`, a force push, or by
  deleting a branch.

## Reporting Security Issues

Do not commit secrets, API keys, credentials, or personal data — not even in
sample or test fixtures. If a secret is ever accidentally committed, tell the
team lead immediately: removing it in a later commit is not enough, because it
remains in Git history and the credential must be rotated.
