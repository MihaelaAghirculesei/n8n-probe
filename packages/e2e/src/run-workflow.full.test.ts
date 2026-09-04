import { describe, it } from 'vitest';

// Full tier: only runs under `pnpm test:e2e:full` (needs Docker).
describe('runWorkflowInFullInstance', () => {
  it.skip('executes a workflow inside a real n8n container', () => {
    // Deferred to a follow-up PR — booting `n8nio/n8n` via testcontainers,
    // importing/executing the workflow and mapping the result back to `IRun`
    // is a self-contained piece of work that also cannot be verified without
    // Docker. The fast in-process tier (`runWorkflow`) covers Milestone 4.
  });
});
