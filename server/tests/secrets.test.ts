import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

/**
 * A guard against committing credentials.
 *
 * The project already had one close call: a Google OAuth client secret and a
 * screenshot of it sitting in the working directory. Neither reached git, but
 * nothing was stopping them. This scans what git actually tracks, so a new
 * credential fails here rather than in a public repository.
 */

const REPO_ROOT = path.resolve(__dirname, '..', '..');

/** Shapes that are credentials wherever they appear. */
const CREDENTIAL_PATTERNS: { name: string; pattern: RegExp }[] = [
  { name: 'Google OAuth client secret', pattern: /GOCSPX-[A-Za-z0-9_-]{10,}/ },
  { name: 'AWS access key id', pattern: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: 'Stripe secret key', pattern: /\bsk_live_[A-Za-z0-9]{16,}/ },
  { name: 'Paystack secret key', pattern: /\bsk_live_[A-Za-z0-9]{16,}/ },
  { name: 'Flutterwave secret key', pattern: /FLWSECK-[A-Za-z0-9]{16,}/ },
  { name: 'GitHub token', pattern: /\bgh[pousr]_[A-Za-z0-9]{36,}/ },
  { name: 'Anthropic API key', pattern: /\bsk-ant-[A-Za-z0-9_-]{20,}/ },
  { name: 'OpenAI API key', pattern: /\bsk-proj-[A-Za-z0-9_-]{20,}/ },
  { name: 'Private key block', pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { name: 'JSON web key with private material', pattern: /"d"\s*:\s*"[A-Za-z0-9_-]{40,}"/ },
];

/** Files whose whole purpose is to hold examples of the above. */
const EXEMPT = [
  /(^|\/)tests\/secrets\.test\.ts$/,
  /\.example$/,
  /(^|\/)\.env\.example$/,
];

function trackedFiles(): string[] {
  const out = execSync('git ls-files -z', { cwd: REPO_ROOT, maxBuffer: 32 * 1024 * 1024 });
  return out.toString('utf8').split('\0').filter(Boolean);
}

describe('Secret hygiene', () => {
  it('tracks no file containing a credential', () => {
    const offenders: string[] = [];

    for (const file of trackedFiles()) {
      if (EXEMPT.some(rx => rx.test(file))) continue;

      const full = path.join(REPO_ROOT, file);
      if (!existsSync(full)) continue;

      let contents: string;
      try {
        contents = readFileSync(full, 'utf8');
      } catch {
        continue; // binary or unreadable
      }
      // Skip anything that looks binary rather than scanning noise.
      if (contents.includes('\u0000')) continue;

      for (const { name, pattern } of CREDENTIAL_PATTERNS) {
        if (pattern.test(contents)) offenders.push(`${file}: ${name}`);
      }
    }

    expect(offenders, `Credentials found in tracked files:\n${offenders.join('\n')}`).toEqual([]);
  });

  it('keeps every .env out of git', () => {
    const tracked = trackedFiles().filter(
      f => /(^|\/)\.env($|\.)/.test(f) && !f.endsWith('.example')
    );
    expect(tracked, `These .env files are tracked:\n${tracked.join('\n')}`).toEqual([]);
  });

  it('tracks no credential screenshot or key file', () => {
    const suspicious = trackedFiles().filter(f =>
      /secret|credential|private[-_ ]?key/i.test(path.basename(f)) &&
      /\.(png|jpe?g|pem|key|p12|pfx|json)$/i.test(f) &&
      !f.endsWith('.example')
    );
    expect(suspicious, `Suspicious files tracked:\n${suspicious.join('\n')}`).toEqual([]);
  });

  it('ignores the patterns that let the near-miss happen', () => {
    const gitignore = readFileSync(path.join(REPO_ROOT, '.gitignore'), 'utf8');
    for (const rule of ['.env', '*.pem', '*.key']) {
      expect(gitignore, `.gitignore is missing "${rule}"`).toContain(rule);
    }
  });
});
