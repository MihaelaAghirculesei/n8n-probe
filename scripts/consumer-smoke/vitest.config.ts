import { n8nProbeVitestConfig } from '@n8n-probe/core/vitest';
import { defineConfig, mergeConfig } from 'vitest/config';

// Exactly what the root README's quick start tells a consumer to write.
export default mergeConfig(n8nProbeVitestConfig(), defineConfig({ test: {} }));
