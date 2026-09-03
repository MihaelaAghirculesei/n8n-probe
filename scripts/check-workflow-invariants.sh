#!/usr/bin/env bash
# Enforces the "CI rules" documented in AGENTS.md. Runs in the `guards` job of
# .github/workflows/ci.yml and can be run locally: bash scripts/check-workflow-invariants.sh
set -euo pipefail

cd "$(dirname "$0")/.."

workflow=.github/workflows/ci.yml
status=0

# Rule 1: no job in the validation workflow may be gated to run only on a push
# to the default branch. Such a job executes after merge, so it cannot be a
# required status check and can turn main red with nothing able to stop it
# (this happened twice with an inlined release job). Release-type automation
# belongs in its own workflow file, where being main-push-only is fine.
if grep -nE "event_name == .push.|ref == .refs/heads/main." "$workflow"; then
  echo "::error file=${workflow}::Rule 1 violated: a job is gated to a push to the default branch only. Move it to its own workflow. See AGENTS.md > CI rules."
  status=1
fi

# Rule 2: the branch ruleset must require exactly the `ci` aggregate check, and
# `ci` must depend on every gating job. Catch the common mistake of adding a job
# without wiring it into `ci`'s `needs:`.
ruleset=.github/rulesets/main.json
required=$(grep -oE '"context": "[^"]+"' "$ruleset" | sed 's/.*"context": "//; s/"//' | sort -u | paste -sd, -)
if [ "$required" != "ci" ]; then
  echo "::error file=${ruleset}::Rule 2 violated: required status checks are [${required}], expected exactly [ci]."
  status=1
fi

exit "$status"
