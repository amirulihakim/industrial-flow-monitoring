# How to Use This Context Pack with Codex in VS Code

## 1. Create the workspace

In a terminal:

```bash
mkdir Timah-Flowmeter
cd Timah-Flowmeter

git clone https://github.com/amirulihakim/dashboard dashboard-legacy
mkdir industrial-flow-monitoring
```

Copy this context pack into:

```text
Timah-Flowmeter/industrial-flow-monitoring/
```

Result:

```text
Timah-Flowmeter/
├── dashboard-legacy/
│   └── ...old code...
└── industrial-flow-monitoring/
    ├── AGENTS.md
    ├── CODEX_WORKFLOW.md
    ├── CODEX_PROMPTS.md
    └── docs/
```

## 2. Initialize the reconstruction repository

```bash
cd industrial-flow-monitoring
git init
git add AGENTS.md CODEX_WORKFLOW.md CODEX_PROMPTS.md docs
git commit -m "docs: establish reconstruction context"
```

Do not initialize or rewrite the old repository unless it was already a clone with its own Git history.

## 3. Open the parent folder in VS Code

From `Timah-Flowmeter/`:

```bash
code .
```

This is important.

Codex can then inspect both:

```text
dashboard-legacy/
industrial-flow-monitoring/
```

while `AGENTS.md` tells it that the former is read-only evidence.

## 4. Start Codex with an audit-only prompt

Do not begin with "rebuild everything."

Use the first prompt from `CODEX_PROMPTS.md`.

The first task should be **read-only analysis of legacy code** plus a tiny new-repo skeleton.

## 5. Review the plan before allowing broad edits

For every milestone, ask Codex to begin by:

- reading the documentation;
- inspecting only relevant legacy files;
- summarizing what it found;
- listing assumptions;
- proposing changed files.

If the plan sounds wrong, correct it before implementation.

## 6. Keep tasks narrow

Good:

```text
Implement Milestone 2 only: simulator.
```

Bad:

```text
Finish the entire dashboard and make it production ready.
```

A narrow task makes it easier to:

- understand the diff;
- detect hallucinated architecture;
- test behavior;
- revert mistakes;
- learn from the code.

## 7. Commit after every working milestone

Typical sequence:

```bash
git add .
git commit -m "feat: add synthetic telemetry engine"
```

Do not wait until the whole project is finished.

If a milestone becomes bad:

```bash
git status
git diff
```

and revert only the reconstruction repository.

The untouched legacy repository remains your safety net.

## 8. Use this ChatGPT thread for architecture/review

Recommended loop:

```text
1. Decide milestone here.
2. Give Codex the milestone prompt.
3. Let Codex inspect/edit/run locally.
4. Review the diff and running result.
5. Bring uncertainties, errors, or important diffs back here.
6. Update docs if the engineering decision changes.
7. Commit.
8. Move to next milestone.
```

This keeps historical/project reasoning separate from implementation execution.

## 9. When you recover more old material

Create locally:

```text
industrial-flow-monitoring/evidence/inbox/
```

Put copies of recovered material there temporarily, for example:

```text
flows.json
old-server.js
esp32.ino
supmea-manual.pdf
screenshots/
```

Then tell Codex:

```text
Inspect evidence/inbox read-only and compare it with
docs/EVIDENCE_REGISTER.md. Do not refactor code yet.
Report what historical uncertainties it resolves.
```

After review, update `EVIDENCE_REGISTER.md`.

Before pushing to a public GitHub repository, remove or sanitize private evidence.

## 10. What context Codex should read for each task

### Always

```text
AGENTS.md
docs/PROJECT_CONTEXT.md
docs/PORTFOLIO_BOUNDARIES.md
```

### Architecture/backend task

Also:

```text
docs/SYSTEM_SPEC.md
docs/DATA_MODEL.md
docs/LEGACY_AUDIT.md
```

### Historical question

Also:

```text
docs/EVIDENCE_REGISTER.md
../dashboard-legacy/
```

### Milestone execution

Also:

```text
docs/REBUILD_PLAN.md
```

## 11. Recommended Codex behavior

Ask Codex to:

- use high reasoning for architecture/refactoring tasks if available;
- inspect before editing;
- run commands itself;
- keep diffs small;
- explain tests;
- flag uncertainty instead of inventing facts.

Do not ask it to reproduce hidden reasoning. Ask for a concise plan, assumptions, changed files, and verification results.

## 12. Important rule for screenshots and visual changes

For UI work, compare against:

- original report screenshots;
- legacy page structure;
- the new specification.

The goal is not pixel-perfect reproduction.

The goal is a recognizable but significantly cleaner engineering dashboard.

## 13. When to stop and ask for help

Stop the Codex task and review before proceeding if it:

- tries to modify `dashboard-legacy`;
- invents industrial units/registers;
- adds React/Next/Vue without a clear reason;
- adds authentication;
- replaces MySQL without approval;
- removes provenance labels;
- generates fake PT Timah data;
- adds large amounts of generic template UI;
- cannot explain a dependency;
- changes multiple milestones at once.

## 14. End-state repository

A reasonable final structure is:

```text
industrial-flow-monitoring/
├── AGENTS.md
├── README.md
├── package.json
├── .env.example
├── public/
│   ├── index.html
│   ├── css/
│   │   └── app.css
│   └── js/
│       ├── app.js
│       ├── api.js
│       └── charts.js
├── server/
│   ├── server.js
│   ├── config.js
│   ├── db.js
│   ├── realtime.js
│   ├── sources/
│   │   ├── simulation.js
│   │   ├── mqtt.js
│   │   └── modbus.js
│   └── routes/
│       └── history.js
├── sql/
│   ├── schema.sql
│   └── seed.sql
├── test/
└── docs/
```

This is a target, not a requirement to create everything at once.
