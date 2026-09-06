import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRunShellCommandTool, ALLOWED_COMMANDS } from "./index.js";

describe("runShellCommand tool", () => {
    let root: string;

    beforeEach(async () => {
        root = await mkdtemp(join(tmpdir(), "shellexec-"));
    });

    afterEach(async () => {
        await rm(root, { recursive: true, force: true });
    });

    it("is never flagged destructive (guardrail is the allow-list + timeout, not confirmation)", () => {
        const tool = createRunShellCommandTool(root);
        expect(tool.isDestructive).toBeUndefined();
    });

    it("runs an allow-listed command and captures stdout", async () => {
        const tool = createRunShellCommandTool(root);
        const result = await tool.execute({ command: "node", args: ["-e", "console.log('hello from sandbox')"] });
        expect(result.isError).toBeFalsy();
        expect(result.content).toContain("hello from sandbox");
    });

    it("rejects a command that isn't on the allow-list, without ever spawning it", async () => {
        const tool = createRunShellCommandTool(root);
        const result = await tool.execute({ command: "rm", args: ["-rf", "/"] });
        expect(result.isError).toBe(true);
        expect(result.content).toMatch(/not allow-listed/);
    });

    it(`allow-list currently contains exactly: ${ALLOWED_COMMANDS.join(", ")}`, () => {
        expect(ALLOWED_COMMANDS).toEqual(["npm", "npx", "node", "tsc"]);
    });

    it("reports a nonzero exit code as a tool error without throwing", async () => {
        const tool = createRunShellCommandTool(root);
        const result = await tool.execute({ command: "node", args: ["-e", "process.exit(1)"] });
        expect(result.isError).toBe(true);
        expect(result.content).toContain("exit code: 1");
    });

    it("kills a command that exceeds its timeout", async () => {
        const tool = createRunShellCommandTool(root, 300);
        const start = Date.now();
        const result = await tool.execute({ command: "node", args: ["-e", "setTimeout(() => {}, 10000)"] });
        expect(Date.now() - start).toBeLessThan(2000);
        expect(result.isError).toBe(true);
        expect(result.content).toMatch(/timed out/);
    });

    it("does not invoke a shell, so metacharacters in args are inert", async () => {
        const tool = createRunShellCommandTool(root);
        const result = await tool.execute({ command: "node", args: ["-e", "console.log(process.argv[1])", "$(echo pwned)"] });
        expect(result.content).toContain("$(echo pwned)");
    });
});