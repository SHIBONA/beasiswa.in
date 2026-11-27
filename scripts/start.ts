// Runs the API server (src/server.ts) and the Next.js front-end (web/) together.
// PORT is the address the member opens; API_PORT (default 3001, 0 = any free port) stays behind the web proxy.
// Usage: bun scripts/start.ts [--dev]
import { spawn, type ChildProcess } from "node:child_process";
import { createRequire } from "node:module";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const WEB_DIR = fileURLToPath(new URL("../web", import.meta.url));
const dev = process.argv.includes("--dev");
const webPort = Number(process.env.PORT) || 3000;
const apiPort = Number(process.env.API_PORT ?? 3001) || (await freePort());
const apiOrigin = `http://127.0.0.1:${apiPort}`;

function freePort() {
  return new Promise<number>((resolve, reject) => {
    const probe = createServer().once("error", reject).listen(0, "127.0.0.1", () => {
      const { port } = probe.address() as { port: number };
      probe.close(() => resolve(port));
    });
  });
}

const children: ChildProcess[] = [];
function run(args: string[], cwd: string, env: Record<string, string>) {
  const child = spawn(process.execPath, args, { cwd, env: { ...process.env, ...env }, stdio: "inherit" });
  children.push(child);
  // If either side stops, stop the other so no half-running app is left behind.
  child.on("exit", (code, signal) => shutdown(code ?? (signal ? 1 : 0)));
  return child;
}

let stopping = false;
function shutdown(code: number) {
  if (stopping) return;
  stopping = true;
  for (const child of children) if (child.exitCode === null) child.kill();
  process.exitCode = code;
}
for (const signal of ["SIGINT", "SIGTERM"] as const) process.on(signal, () => shutdown(0));

async function waitForApi() {
  for (let i = 0; i < 100 && !stopping; i++) {
    try {
      if ((await fetch(`${apiOrigin}/api/meta`)).ok) return;
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error("Server API tidak menyala.");
}

run(["src/server.ts"], ROOT, { PORT: String(apiPort) });
await waitForApi();
const nextBin = createRequire(`${WEB_DIR}/package.json`).resolve("next/dist/bin/next");
run([nextBin, dev ? "dev" : "start", "--hostname", "127.0.0.1", "--port", String(webPort)], WEB_DIR, {
  PORT: String(webPort), API_ORIGIN: apiOrigin,
});
console.log(`beasiswa.in: http://localhost:${webPort}`);
