/**
 * Maps the hosted Supabase URL shape onto a bare PostgREST instance:
 * supabase-js calls <url>/rest/v1/<table>, PostgREST serves /<table>.
 *
 * Running this in front of PostgREST keeps the application code identical
 * between local development and production.
 */
import { createServer } from 'node:http';

const LISTEN_PORT = Number(process.env.PROXY_PORT ?? 54321);
const POSTGREST_PORT = Number(process.env.POSTGREST_PORT ?? 54322);
const STRIPPED_PREFIXES = ['/rest/v1', '/auth/v1', '/storage/v1'];

const server = createServer(async (req, res) => {
  const original = req.url ?? '/';
  const prefix = STRIPPED_PREFIXES.find((p) => original.startsWith(p));
  const path = prefix ? original.slice(prefix.length) || '/' : original;

  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (typeof value === 'string' && key !== 'host' && key !== 'connection') {
      headers.set(key, value);
    }
  }

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const body = chunks.length ? Buffer.concat(chunks) : undefined;

  try {
    const upstream = await fetch(`http://127.0.0.1:${POSTGREST_PORT}${path}`, {
      method: req.method,
      headers,
      body,
    });
    res.writeHead(upstream.status, Object.fromEntries(upstream.headers));
    res.end(Buffer.from(await upstream.arrayBuffer()));
  } catch (err) {
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: `proxy: ${err instanceof Error ? err.message : 'failed'}` }));
  }
});

server.listen(LISTEN_PORT, () => {
  console.log(`supabase-proxy: :${LISTEN_PORT} -> postgrest :${POSTGREST_PORT}`);
});
