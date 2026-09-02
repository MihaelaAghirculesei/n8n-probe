# Repository automation

## Branch protection (`main`)

`main` is protected with a repository **ruleset** (rulesets work on private
repos on every GitHub plan; classic branch protection does not). The ruleset is
kept as code in [`rulesets/main.json`](rulesets/main.json) and applied with:

```bash
gh api -X POST repos/<owner>/n8n-probe/rulesets --input .github/rulesets/main.json
```

To update it later, find its id and PUT:

```bash
gh api repos/<owner>/n8n-probe/rulesets --jq '.[] | "\(.id)\t\(.name)"'
gh api -X PUT repos/<owner>/n8n-probe/rulesets/<id> --input .github/rulesets/main.json
```

Effect: no direct pushes to `main`; merges only via PR, **rebase-only** (keeps
the granular commits and a linear history) with the CI `build` matrix
(Node 22 + 24) green and up to date, no force-push, no deletion, review threads
resolved. `bypass_actors` is empty — nobody bypasses; add an entry (e.g. repo
admin) if an escape hatch is wanted.

## Workflows

- [`workflows/ci.yml`](workflows/ci.yml) — lint, typecheck, test, build on
  every push/PR; nightly schedule drives the opt-in full-instance E2E tier;
  Changesets release job on `main`.
