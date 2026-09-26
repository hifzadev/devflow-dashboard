# Documentation

| Document | Purpose |
|---|---|
| [architecture.md](architecture.md) | How the system is put together: layout, control flow, data model, security model, and the rationale behind each technology choice |
| [architecture-diagram.png](architecture-diagram.png) | Architecture diagram of the build |
| [WORKFLOW.md](WORKFLOW.md) | The analysis pipeline in detail — what each of the five modules checks, and how findings become an action plan and report |
| [DEMO.md](DEMO.md) | Step-by-step demo script for the hackathon, with talking points and timing |
| [devflow-plan.md](devflow-plan.md) | The architecture and 9-sub-task implementation plan produced in IBM Bob plan mode, with per-sub-task status |

## Where things live

| Topic | Location |
|---|---|
| Project overview, setup, team, Bob usage | [`../README.md`](../README.md) |
| Contribution, branching, commit and PR rules | [`../CONTRIBUTING.md`](../CONTRIBUTING.md) |
| Release history | [`../CHANGELOG.md`](../CHANGELOG.md) |
| Persistent IBM Bob project context | [`../AGENTS.md`](../AGENTS.md) |
| Bob session screenshots | [`../bob_sessions/`](../bob_sessions/) |

## A note on the sample project

`sample-project/` is the **analysis target**, and its defects are intentional.
It is missing a `.gitignore` and an `.env.example`, its `package.json` is
missing `description`, `engines` and `license`, its source contains TODO/FIXME
markers, `async` handlers without `try`/`catch`, `console.log` calls and
duplicated blocks, its README is incomplete, and one test assertion
deliberately fails.

Those unresolved issues are the product demo. Do not fix them, and do not add
a `.gitignore` or `.env.example` to that directory.

One exception is harmless: `sample-project/package-lock.json` may gain an
`engines` entry, because the build/release module runs `npm install` there
during analysis.
