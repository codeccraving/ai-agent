import { spawn } from "node:child_process";

export interface ExecResult {
    code: number | null
    stdout: string
    stderr: string
    timedOut: boolean
}

export interface ExecOptions {
    cwd: string
    timeoutMs: number
    maxOutputBytes?: number
}

const DEFAULT_MAX_OUTPUT_BYTES = 200_000;

export function execWithTimeout(command: string, args: string[], options: ExecOptions): Promise<ExecResult> {
    const maxBytes = options.maxOutputBytes ?? DEFAULT_MAX_OUTPUT_BYTES;

    return new Promise((resolvePromise) => {
        // detached:true puts the child in its own process group (pgid === child.pid).
        // Commands like `npm test` actually spawn a shell which spawns the real
        // process (npm -> sh -c "..." -> node), so killing only `child` leaves
        // grandchildren running, holding stdout/stderr pipes open, and `close`
        // never fires. Killing the negative pid targets the whole group at once.
        const child = spawn(command, args, { cwd: options.cwd, shell: false, detached: true });

        let stdout = "";
        let stderr = "";
        let timedOut = false;
        let settled = false;

        const killGroup = (signal: NodeJS.Signals) => {
            try {
                process.kill(-child.pid!, signal);
            } catch {
                // Group already gone, or child.pid unavailable (spawn failed) — fall back to direct kill.
                try { child.kill(signal); } catch { /* already exited */ }
            }
        };

        const killTimer = setTimeout(() => {
            timedOut = true;
            killGroup("SIGTERM");
            setTimeout(() => killGroup("SIGKILL"), 2000).unref();
        }, options.timeoutMs);

        // maxOutputBytes enforcement lives here — NOT in the spawn() options —
        // because spawn() streams data as it arrives rather than buffering it
        // for you, so bounding memory on runaway output is on us.
        child.stdout.on("data", (d) => {
            if (stdout.length < maxBytes) stdout += d;
        });
        child.stderr.on("data", (d) => {
            if (stderr.length < maxBytes) stderr += d;
        });

        child.on("error", (err) => {
            if (settled) return;
            settled = true;
            clearTimeout(killTimer);
            resolvePromise({ code: null, stdout, stderr: stderr + `\n${err.message}`, timedOut });
        });

        child.on("close", (code) => {
            if (settled) return;
            settled = true;
            clearTimeout(killTimer);
            resolvePromise({
                code,
                stdout: stdout.length > maxBytes ? stdout.slice(0, maxBytes) + "\n...[truncated]" : stdout,
                stderr: stderr.length > maxBytes ? stderr.slice(0, maxBytes) + "\n...[truncated]" : stderr,
                timedOut,
            });
        });
    });
}