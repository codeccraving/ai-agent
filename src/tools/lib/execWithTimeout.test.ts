import { describe, it, expect } from "vitest";
import { execWithTimeout } from "./execWithTimeout.js";

describe("execWithTimeout", () => {
    it("captures stdout and a zero exit code for a successful command", async () => {
        const result = await execWithTimeout("node", ["-e", "console.log('hi'); process.exit(0)"], {
            cwd: process.cwd(),
            timeoutMs: 5000,
        });
        expect(result.code).toBe(0);
        expect(result.stdout).toContain("hi");
        expect(result.timedOut).toBe(false);
    });

    it("captures a nonzero exit code without treating it as a tool error", async () => {
        const result = await execWithTimeout("node", ["-e", "process.exit(1)"], {
            cwd: process.cwd(),
            timeoutMs: 5000,
        });
        expect(result.code).toBe(1);
        expect(result.timedOut).toBe(false);
    });

    it("kills a long-running command once it exceeds the timeout", async () => {
        const start = Date.now();
        const result = await execWithTimeout("node", ["-e", "setTimeout(() => {}, 10000)"], {
            cwd: process.cwd(),
            timeoutMs: 300,
        });
        const elapsed = Date.now() - start;
        expect(result.timedOut).toBe(true);
        expect(elapsed).toBeLessThan(2000); // well under the 10s sleep — proves it was actually killed
    });

    it("never invokes a shell, so shell metacharacters in args are inert", async () => {
        // If this were run through a shell, "; touch /tmp/pwned" would execute as a second command.
        // With shell:false + argv array, it's just a literal string argument to `node -e`, which errors harmlessly.
        const result = await execWithTimeout("node", ["-e", "console.log(process.argv[1])", "$(whoami); echo pwned"], {
            cwd: process.cwd(),
            timeoutMs: 5000,
        });
        expect(result.stdout).toContain("$(whoami); echo pwned");
    });

    it("truncates output beyond maxOutputBytes", async () => {
        const result = await execWithTimeout("node", ["-e", "console.log('x'.repeat(1000))"], {
            cwd: process.cwd(),
            timeoutMs: 5000,
            maxOutputBytes: 100,
        });
        expect(result.stdout.length).toBeLessThan(200);
        expect(result.stdout).toContain("...[truncated]");
    });
});