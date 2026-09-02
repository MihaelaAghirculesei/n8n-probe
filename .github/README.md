# Repository automation

## Branch protection

`main` is protected. The ruleset is kept as code in
[`branch-protection.json`](branch-protection.json) and applied with:

```bash
gh api -X PUT repos/<owner>/n8n-probe/branches/main/protection \
  --input .github/branch-protection.json
```

Effect: no direct pushes to `main`, merges only via PR with the CI `build`
matrix (Node 22 + 24) green, linear history, conversations resolved.

## Workflows

- [`workflows/ci.yml`](workflows/ci.yml) — lint, typecheck, test, build on
  every push/PR; nightly schedule drives the opt-in full-instance E2E tier;
  Changesets release job on `main`.
