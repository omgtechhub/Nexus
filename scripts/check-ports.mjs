/**
 * Preflight for `npm run dev`.
 *
 * Both halves of the app have to come up, and a half-started stack fails in a
 * way that reads like a bug in the page rather than a missing process: with
 * nothing on the API port the browser reports a bare "Failed to fetch", no
 * status code, no server log. This catches that before either process starts
 * and says which port is the problem.
 *
 * A busy API port is fatal for the obvious reason. A busy *web* port is fatal
 * too, which is less obvious: Vite would quietly move to the next free port,
 * but the server's CORS allow-list is pinned to one origin, so every request
 * from the bumped port would be rejected — a second confusing failure a few
 * minutes later.
 */
import net from 'node:net';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Read one key out of server/.env without pulling in dotenv. */
function envValue(key, fallback) {
  try {
    const line = readFileSync(join(root, 'server', '.env'), 'utf8')
      .split('\n')
      .find(l => l.trim().startsWith(`${key}=`));
    return line ? line.slice(line.indexOf('=') + 1).trim() : fallback;
  } catch {
    return fallback;
  }
}

/**
 * True when something is already listening on the port.
 *
 * This connects rather than attempting a bind. A bind probe is unreliable here:
 * a dev server that listens only on ::1 (which is how Vite binds by default)
 * does not necessarily collide with a probe on the wildcard address or on
 * 127.0.0.1, so the port reads as free when it plainly is not. Dialling both
 * loopback addresses and taking either success as "in use" has no such gap.
 */
function listeningOn(host, port) {
  return new Promise(resolve => {
    const socket = new net.Socket();
    const done = result => {
      socket.destroy();
      resolve(result);
    };
    socket.setTimeout(700);
    socket.once('connect', () => done(true));
    socket.once('timeout', () => done(false));
    socket.once('error', () => done(false));
    socket.connect(port, host);
  });
}

async function inUse(port) {
  const results = await Promise.all(
    ['127.0.0.1', '::1'].map(host => listeningOn(host, port))
  );
  return results.some(Boolean);
}

const apiPort = Number(process.env.PORT || envValue('PORT', '5000'));
const webOrigin = process.env.FRONTEND_URL || envValue('FRONTEND_URL', 'http://localhost:5173');
const webPort = Number(new URL(webOrigin).port || '5173');

const busy = [];
for (const [name, port] of [['API', apiPort], ['web', webPort]]) {
  if (await inUse(port)) busy.push({ name, port });
}

if (busy.length) {
  const list = busy.map(b => `  ${b.name} port ${b.port}`).join('\n');
  console.error(
    `\n  Cannot start: ${busy.length === 2 ? 'both ports are' : 'a port is'} already in use.\n\n${list}\n\n` +
    `  Something is still running — most likely a dev server from an earlier session.\n` +
    `  Find and stop it, then try again:\n\n` +
    `    Windows   netstat -ano | findstr :${busy[0].port}      then  taskkill /F /PID <pid>\n` +
    `    macOS/Linux   lsof -ti :${busy[0].port} | xargs kill\n\n` +
    `  To run only one half on purpose, use npm run dev:web or npm run dev:api.\n`
  );
  process.exit(1);
}
