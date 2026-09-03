/** Handle to a running WireMock container. */
export interface WireMockHandle {
  /** Base URL the mapped port is reachable on, e.g. `http://localhost:32784`. */
  baseUrl: string;
  /** Stop and remove the container. */
  stop(): Promise<void>;
}

/** Options for {@link startWireMock}. */
export interface StartWireMockOptions {
  /** Host directory of WireMock JSON mappings, bind-mounted read-only. */
  mappingsDir?: string;
  /** Image tag to run. Defaults to a pinned `wiremock/wiremock` release. */
  image?: string;
}

const DEFAULT_IMAGE = 'wiremock/wiremock:3.13.2';
const WIREMOCK_PORT = 8080;

/**
 * Boot a real WireMock server in a container via `testcontainers`, for
 * contract-style tests that need an actual HTTP server (reusable stub mappings,
 * latency, fault injection) rather than in-process interception.
 *
 * `testcontainers` is an optional peer dependency and Docker must be running;
 * this is the opt-in tier, never part of `pnpm test`. Always `await stop()` in
 * a matching teardown.
 */
export async function startWireMock(options: StartWireMockOptions = {}): Promise<WireMockHandle> {
  const { GenericContainer, Wait } = await import('testcontainers');

  let container = new GenericContainer(options.image ?? DEFAULT_IMAGE)
    .withExposedPorts(WIREMOCK_PORT)
    .withWaitStrategy(Wait.forHttp('/__admin/mappings', WIREMOCK_PORT).forStatusCode(200));

  if (options.mappingsDir !== undefined) {
    container = container.withBindMounts([
      { source: options.mappingsDir, target: '/home/wiremock/mappings', mode: 'ro' },
    ]);
  }

  const started = await container.start();
  const baseUrl = `http://${started.getHost()}:${started.getMappedPort(WIREMOCK_PORT)}`;

  return {
    baseUrl,
    stop: async () => {
      await started.stop();
    },
  };
}
