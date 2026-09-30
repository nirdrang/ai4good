import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { readFile, mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { extname, join, resolve, sep } from 'node:path';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll } from 'vitest';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const HOST = fileURLToPath(new URL('./screen-host.mjs', import.meta.url));

export type Viewport = 'desktop' | 'phone' | 'narrow' | 'short';
export const VIEWPORT_SIZE: Record<Viewport, { width: number; height: number }> = {
  desktop: { width: 1280, height: 800 },
  phone: { width: 390, height: 844 },
  narrow: { width: 320, height: 800 },
  short: { width: 320, height: 700 },
};

export type StaticShell = { readonly baseUrl: string; close(): Promise<void> };

export type LocatorStep = {
  role?: string;
  name?: string;
  text?: string;
  exact?: boolean;
  /** `last` picks the last match. A number is the zero-based match. */
  position?: number | 'last';
};

export type ScreenFile = { name: string; mimeType: string; base64: string };

export type ScreenPage = {
  click(chain: LocatorStep[]): Promise<void>;
  fill(chain: LocatorStep[], text: string): Promise<void>;
  press(chain: LocatorStep[], key: string): Promise<void>;
  text(chain: LocatorStep[], timeoutMs?: number): Promise<string>;
  count(chain: LocatorStep[]): Promise<number>;
  visible(chain: LocatorStep[]): Promise<boolean>;
  box(chain: LocatorStep[]): Promise<{ x: number; y: number; width: number; height: number } | null>;
  attribute(chain: LocatorStep[], name: string): Promise<string | null>;
  style(chain: LocatorStep[], name: string): Promise<string>;
  scroll(chain: LocatorStep[], top?: number): Promise<void>;
  scrollIntoView(chain: LocatorStep[]): Promise<void>;
  focused(chain: LocatorStep[]): Promise<boolean>;
  value(chain: LocatorStep[]): Promise<string>;
  setFiles(chain: LocatorStep[], files: ScreenFile[]): Promise<void>;
  modelCalls(): Promise<readonly string[]>;
  reload(): Promise<void>;
  screenshot(): Promise<string>;
};

export function shellUrl(
  baseUrl: string,
  scenario: string,
  start: 'chat' | 'review',
  pace: 'test' | 'demo' = 'test',
): string {
  const route = start === 'review' ? 'discovery-review' : 'discovery';
  return `${baseUrl}/?scenario=${encodeURIComponent(scenario)}&pace=${pace}#${route}`;
}

export function mimeType(fileName: string): string {
  switch (extname(fileName)) {
    case '.html':
      return 'text/html; charset=utf-8';
    case '.js':
      return 'text/javascript; charset=utf-8';
    case '.css':
      return 'text/css; charset=utf-8';
    case '.json':
      return 'application/json';
    case '.svg':
      return 'image/svg+xml';
    case '.png':
      return 'image/png';
    case '.woff2':
      return 'font/woff2';
    case '.map':
      return 'application/json';
    default:
      return 'application/octet-stream';
  }
}

/** Polls `read` until `accept` holds or the time runs out. The error names `what` and the last value. */
export async function eventually<T>(
  what: string,
  read: () => Promise<T>,
  accept: (value: T) => boolean,
  timeoutMs = 5_000,
): Promise<T> {
  const start = Date.now();
  let last: T | undefined;
  for (;;) {
    last = await read();
    if (accept(last)) return last;
    if (Date.now() - start >= timeoutMs) {
      throw new Error(`${what}: timed out after ${timeoutMs}ms; last value ${JSON.stringify(last)}`);
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 20));
  }
}

function runVite(outDir: string, viteConfig: string): Promise<void> {
  const viteJs = join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js');
  return new Promise((resolveRun, reject) => {
    const child = spawn(
      process.execPath,
      [viteJs, 'build', '--config', viteConfig, '--configLoader', 'native', '--outDir', outDir, '--emptyOutDir'],
      { cwd: ROOT, windowsHide: true },
    );
    let output = '';
    child.stdout?.on('data', (chunk: Buffer) => {
      output += String(chunk);
    });
    child.stderr?.on('data', (chunk: Buffer) => {
      output += String(chunk);
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolveRun();
      else {
        const tail = output.trim().split(/\r?\n/).slice(-40).join('\n');
        reject(new Error(`vite build exited ${code}\n${tail}`));
      }
    });
  });
}

function fileFor(root: string, urlPath: string): string | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(urlPath);
  } catch {
    return null;
  }
  if (decoded.includes('\0')) return null;
  const pathname = decoded === '/' ? '/index.html' : decoded;
  const segments = pathname.split('/').filter((segment) => segment.length > 0);
  if (
    segments.some(
      (segment) => segment === '..' || segment === '.' || segment.includes('\\') || segment.includes(':'),
    )
  ) {
    return null;
  }
  const target = resolve(root, ...segments);
  const rootResolved = resolve(root);
  if (target !== rootResolved && !target.startsWith(rootResolved + sep)) return null;
  return target;
}

function send(res: ServerResponse, status: number, type: string, body: string | Buffer) {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(body);
}

async function serveFile(root: string, req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url ?? '/', 'http://127.0.0.1');
  const target = fileFor(root, url.pathname);
  if (!target) {
    send(res, 400, 'text/plain; charset=utf-8', 'Bad path');
    return;
  }
  try {
    const info = await stat(target);
    if (!info.isFile()) {
      send(res, 404, 'text/plain; charset=utf-8', 'Not found');
      return;
    }
    const body = await readFile(target);
    res.writeHead(200, { 'Content-Type': mimeType(target), 'Cache-Control': 'no-store' });
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') send(res, 404, 'text/plain; charset=utf-8', 'Not found');
    else send(res, 500, 'text/plain; charset=utf-8', 'The fixture shell could not read this file.');
  }
}

/**
 * Builds the fixture shell into a temporary folder outside the repository, so a test run never
 * writes the worktree, and serves that folder from this process.
 */
export async function buildAndServe(opts: { viteConfig: string }): Promise<StaticShell> {
  const outDir = await mkdtemp(join(tmpdir(), 'ai4good-discovery-'));
  try {
    await runVite(outDir, opts.viteConfig);
  } catch (error) {
    await rm(outDir, { recursive: true, force: true });
    throw error;
  }
  const server = createServer((req, res) => {
    serveFile(outDir, req, res).catch(() => {
      if (!res.headersSent) send(res, 500, 'text/plain; charset=utf-8', 'The fixture shell could not read this file.');
    });
  });
  server.on('clientError', (_error, socket) => {
    socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
  });
  await new Promise<void>((resolveListen, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolveListen());
  });
  const address = server.address();
  if (address === null || typeof address === 'string') {
    server.close();
    await rm(outDir, { recursive: true, force: true });
    throw new Error('the fixture shell did not bind a port');
  }
  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    async close() {
      // Drop keep-alive sockets after close starts, so the listening socket can finish.
      // A server that has already stopped is a finished close, not a failure.
      await new Promise<void>((resolveClose, reject) => {
        server.close((error) => {
          const code = (error as NodeJS.ErrnoException | undefined)?.code;
          if (!error || code === 'ERR_SERVER_NOT_RUNNING') resolveClose();
          else reject(error);
        });
        server.closeAllConnections?.();
      });
      await rm(outDir, { recursive: true, force: true });
    },
  };
}

type HostResponse = { id: number; ok: true; value: unknown } | { id: number; ok: false; error: string };

export type ScreenHost = {
  call<T>(op: string, args: Record<string, unknown>, timeoutMs: number): Promise<T>;
  shutdown(): Promise<void>;
};

/** Bun's Playwright launch hangs on this machine. Node owns Chromium and speaks JSON lines. */
export function createScreenHost(): ScreenHost {
  return startHost();
}

function startHost(): ScreenHost {
  const child = spawn('node', [HOST], { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true }) as ChildProcessWithoutNullStreams;
  const waiting = new Map<number, { resolve: (value: unknown) => void; reject: (error: Error) => void }>();
  let seq = 0;
  let stderr = '';
  let closed = false;
  child.stderr.on('data', (chunk: Buffer) => {
    stderr += String(chunk);
    if (stderr.length > 8_000) stderr = stderr.slice(-8_000);
  });
  const failAll = (error: Error) => {
    for (const pending of waiting.values()) pending.reject(error);
    waiting.clear();
  };
  child.on('error', (error) => {
    closed = true;
    failAll(error);
  });
  child.on('exit', (code) => {
    closed = true;
    const tail = stderr.trim();
    failAll(new Error(`screen host exited ${code}${tail.length > 0 ? `\n${tail}` : ''}`));
  });
  createInterface({ input: child.stdout }).on('line', (line) => {
    let message: HostResponse;
    try {
      message = JSON.parse(line) as HostResponse;
    } catch {
      return;
    }
    const pending = waiting.get(message.id);
    if (!pending) return;
    waiting.delete(message.id);
    if (message.ok) pending.resolve(message.value);
    else pending.reject(new Error(message.error));
  });

  function call<T>(op: string, args: Record<string, unknown>, timeoutMs: number): Promise<T> {
    return new Promise((resolveCall, reject) => {
      if (closed || !child.stdin.writable) {
        reject(new Error('the screen host is not running'));
        return;
      }
      const id = ++seq;
      const timer = setTimeout(() => {
        waiting.delete(id);
        reject(new Error(`screen host timed out on ${op} after ${timeoutMs}ms`));
      }, timeoutMs);
      waiting.set(id, {
        resolve: (value) => {
          clearTimeout(timer);
          resolveCall(value as T);
        },
        reject: (error) => {
          clearTimeout(timer);
          reject(error);
        },
      });
      child.stdin.write(`${JSON.stringify({ id, op, args })}\n`, (error) => {
        if (!error) return;
        clearTimeout(timer);
        waiting.delete(id);
        reject(error);
      });
    });
  }

  return {
    call,
    async shutdown() {
      const errors: string[] = [];
      try {
        await call('shutdown', {}, 15_000);
      } catch (error) {
        errors.push(error instanceof Error ? error.message : String(error));
      }
      child.stdin.end();
      const exited = await new Promise<boolean>((resolveExit) => {
        if (closed) {
          resolveExit(true);
          return;
        }
        const timer = setTimeout(() => resolveExit(false), 10_000);
        child.once('exit', () => {
          clearTimeout(timer);
          resolveExit(true);
        });
      });
      if (!exited) {
        child.kill();
        errors.push('the screen host did not exit');
      }
      if (errors.length > 0) throw new Error(errors.join('; '));
    },
  };
}

function pageApi(host: ScreenHost, pageId: number): ScreenPage {
  const args = (chain: LocatorStep[], extra: Record<string, unknown> = {}) => ({ page: pageId, chain, ...extra });
  return {
    click: (chain) => host.call('click', args(chain), 10_000),
    fill: (chain, text) => host.call('fill', args(chain, { text }), 10_000),
    press: (chain, key) => host.call('press', args(chain, { key }), 10_000),
    text: (chain, timeoutMs) => host.call('text', args(chain, { timeout: timeoutMs }), 10_000),
    count: (chain) => host.call('count', args(chain), 10_000),
    visible: (chain) => host.call('visible', args(chain), 10_000),
    box: (chain) => host.call('box', args(chain), 10_000),
    attribute: (chain, name) => host.call('attribute', args(chain, { name }), 10_000),
    style: (chain, name) => host.call('style', args(chain, { name }), 10_000),
    scroll: (chain, top = 0) => host.call('scroll', args(chain, { top }), 10_000),
    scrollIntoView: (chain) => host.call('scrollIntoView', args(chain), 10_000),
    focused: (chain) => host.call('focused', args(chain), 10_000),
    value: (chain) => host.call('value', args(chain), 10_000),
    setFiles: (chain, files) => host.call('setFiles', args(chain, { files }), 10_000),
    modelCalls: () => host.call('modelCalls', { page: pageId }, 10_000),
    reload: () => host.call('reload', { page: pageId }, 20_000),
    screenshot: () => host.call('screenshot', { page: pageId }, 15_000),
  };
}

export function bindScreenPage(host: ScreenHost, pageId: number): ScreenPage {
  return pageApi(host, pageId);
}

export type ScreenDriver = {
  open(input: {
    url: (baseUrl: string) => string;
    viewport: Viewport;
    colorScheme?: 'light' | 'dark';
    probeName?: string;
  }): Promise<{ page: ScreenPage; close(): Promise<void> }>;
};

/**
 * One build, one server and one Chromium for the calling test file.
 * `enabled: false` registers nothing, so a tier that does not drive the shell builds nothing.
 * A teardown failure throws from afterAll, which the expect gate counts as a file error.
 */
export function useScreenDriver(opts: { viteConfig: string; enabled: boolean }): ScreenDriver {
  let shell: StaticShell | null = null;
  let host: ScreenHost | null = null;
  if (opts.enabled) {
    beforeAll(async () => {
      shell = await buildAndServe({ viteConfig: opts.viteConfig });
      host = startHost();
      await host.call('launch', {}, 45_000);
    }, 180_000);
    afterAll(async () => {
      const errors: string[] = [];
      if (host) {
        try {
          await host.shutdown();
        } catch (error) {
          errors.push(`browser shutdown: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
      if (shell) {
        try {
          await shell.close();
        } catch (error) {
          errors.push(`shell shutdown: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
      if (errors.length > 0) {
        const message = `screen driver teardown failed: ${errors.join('; ')}`;
        console.error(message);
        throw new Error(message);
      }
    });
  }
  return {
    async open(input) {
      const activeHost = host;
      const activeShell = shell;
      if (!opts.enabled || !activeHost || !activeShell) throw new Error('the screen driver is not started');
      const pageId = await activeHost.call<number>(
        'open',
        {
          url: input.url(activeShell.baseUrl),
          viewport: VIEWPORT_SIZE[input.viewport],
          phone: input.viewport !== 'desktop',
          colorScheme: input.colorScheme ?? 'light',
          probe: input.probeName,
        },
        20_000,
      );
      return {
        page: pageApi(activeHost, pageId),
        close: () => activeHost.call('close', { page: pageId }, 10_000),
      };
    },
  };
}
