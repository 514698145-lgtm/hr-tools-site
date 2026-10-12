import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {realpathSync} from 'node:fs';
import {isIP} from 'node:net';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createFeedbackApi} from './feedback-api.mjs';

export function validateOrigin(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password ||
      url.pathname !== '/' || url.search || url.hash ||
      ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
    throw new Error('HR_PUBLIC_ORIGIN must be a public HTTPS origin');
  }
  return url.origin;
}

// One systemd process owns the persistent files. Never use cluster/PM2 replicas.
export async function createRuntimeServer({origin, directory, password} = {}) {
  origin = validateOrigin(origin);
  if (!directory || !path.isAbsolute(directory)) throw new Error('Persistent data directory must be absolute');
  const tools = JSON.parse(await readFile(new URL('../config/tools.json', import.meta.url), 'utf8'))
    .map(tool => tool.id).concat(['hr-templates', 'official-sites', 'contract-reminders', 'relax']);
  const api = await createFeedbackApi({directory, password, publicOrigin: origin});
  const server = http.createServer(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    try {
      const url = new URL(req.url, 'http://localhost');
      if (url.pathname === '/healthz' && req.method === 'GET') {
        res.writeHead(200, {'Content-Type':'application/json'});
        res.end('{"ok":true}'); return;
      }
      // Only loopback Nginx can reach this listener; it overwrites this header.
      const address = req.headers['x-real-ip'];
      if (typeof address === 'string' && isIP(address)) req.trialClientIp = address;
      if (await api(req, res, url, tools)) return;
      res.writeHead(404); res.end('Not found');
    } catch {
      if (!res.headersSent) res.writeHead(500);
      res.end('Request failed');
    }
  });
  server.headersTimeout = 10000;
  server.requestTimeout = 15000;
  server.maxHeadersCount = 64;
  return server;
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 4323);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT');
  const server = await createRuntimeServer({origin: process.env.HR_PUBLIC_ORIGIN,
    directory: process.env.FEEDBACK_DATA_DIR, password: process.env.HR_ADMIN_PASSWORD});
  server.listen(port, '127.0.0.1', () => console.log(`HR runtime listening on loopback port ${port}`));
  for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10000).unref();
  });
}
