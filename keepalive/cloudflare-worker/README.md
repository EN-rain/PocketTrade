# PocketTrade keep-alive Worker

Cloudflare Worker with a 5-minute cron trigger that pings the Render backend's
public `/health` endpoint, so the Free web service does not spin down after
15 minutes of inactivity.

`/health` answers instantly because the Dockerfile sets
`HEALTH_CHECK_DB=false`, so the ping never touches Neon. No Render API key is
involved.

## Deploy (free Cloudflare account)

```bash
cd keepalive/cloudflare-worker
npx wrangler login
npx wrangler deploy
```

Wrangler prints the Worker URL. A GET to that URL performs one ping and returns
JSON, which is handy for checking it works:

```bash
curl https://pockettrade-keepalive.<your-subdomain>.workers.dev/
```

## Change the target

Edit `HEALTH_URL` in `wrangler.toml` (or set it as a Worker variable in the
Cloudflare dashboard) and redeploy. Use this if the Render service is renamed
or the API moves.

## Turn it off

```bash
npx wrangler delete
```

Delete the Worker when the backend moves to a paid instance type, which never
sleeps.

## Local equivalent

`scripts/keepalive.ps1` does the same single ping, and
`scripts/install-keepalive-task.ps1` registers it every 5 minutes in Windows
Task Scheduler. That only runs while your PC is on, so the Worker is the
better option for a public demo.
