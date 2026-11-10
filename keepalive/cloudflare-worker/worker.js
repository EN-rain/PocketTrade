/**
 * PocketTrade keep-alive Worker.
 *
 * Render spins a Free web service down after 15 minutes without inbound
 * traffic. This Worker pings the public /health endpoint on a cron trigger so
 * the backend stays warm without relying on GitHub Actions.
 *
 * /health answers instantly because the Dockerfile sets HEALTH_CHECK_DB=false,
 * so the ping never touches Neon.
 */

const DEFAULT_HEALTH_URL = 'https://pockettrade-ebaq.onrender.com/health';

async function ping(env) {
  const url = env.HEALTH_URL || DEFAULT_HEALTH_URL;
  const startedAt = Date.now();
  try {
    const response = await fetch(url, {
      headers: { 'user-agent': 'pockettrade-keepalive/1.0' },
      // A cold start can outlast the subrequest window; aborting still wakes
      // Render, and the next scheduled run reports the real result.
      signal: AbortSignal.timeout(25_000),
    });
    return { ok: response.ok, status: response.status, url, ms: Date.now() - startedAt };
  } catch (error) {
    return { ok: false, error: String(error), url, ms: Date.now() - startedAt };
  }
}

export default {
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(ping(env).then((result) => console.log(JSON.stringify(result))));
  },

  // Manual check: curl https://<worker>.workers.dev/
  async fetch(_request, env) {
    const result = await ping(env);
    return new Response(JSON.stringify(result), {
      status: result.ok ? 200 : 502,
      headers: { 'content-type': 'application/json' },
    });
  },
};
