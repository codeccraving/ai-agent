import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRunTestsTool } from "./index.js";

// Minimal fixture "project" with an npm test script — no real test framework
// needed since we're only validating exit-code plumbing, not vitest itself.
async function makeFixtureProject(root: string, testScriptBody: string) {
    await writeFile(join(root, "package.json"), JSON.stringify({
        name: "fixture",
        scripts: { test: `node -e "${testScriptBody}"` },
    }));
}

describe("runTests tool", () => {
    let root: string;

    beforeEach(async () => {
        root = await mkdtemp(join(tmpdir(), "runtests-"));
    });

    afterEach(async () => {
        await rm(root, { recursive: true, force: true });
    });

    it("is never flagged destructive", () => {
        const tool = createRunTestsTool(root);
        expect(tool.isDestructive).toBeUndefined();
    });

    it("reports passed:true on a zero exit code", async () => {
        await makeFixtureProject(root, "process.exit(0)");
        const tool = createRunTestsTool(root);
        const result = await tool.execute({});
        expect(result.isError).toBeFalsy();
        expect(result.content).toContain("passed: true");
    });

    it("reports passed:false (as a tool error) on a nonzero exit code", async () => {
        await makeFixtureProject(root, "process.exit(1)");
        const tool = createRunTestsTool(root);
        const result = await tool.execute({});
        expect(result.isError).toBe(true);
        expect(result.content).toContain("passed: false");
    });

    it("forwards a pattern arg through `npm test --`", async () => {
        // Script echoes argv so we can confirm the pattern actually reached it
        await writeFile(join(root, "package.json"), JSON.stringify({
            name: "fixture",
            scripts: { test: "node -e \"console.log(process.argv[1]); process.exit(0)\"" },
        }));
        const tool = createRunTestsTool(root);
        const result = await tool.execute({ pattern: "src/foo.test.ts" });
        expect(result.content).toContain("src/foo.test.ts");
    });

    it("kills a run that exceeds its timeout", async () => {
        await makeFixtureProject(root, "setTimeout(() => {}, 10000)");
        const tool = createRunTestsTool(root, 300);
        const start = Date.now();
        const result = await tool.execute({});
        expect(Date.now() - start).toBeLessThan(2000);
        expect(result.isError).toBe(true);
        expect(result.content).toMatch(/timed out/);
    });

    it("rejects when the project root escapes / does not exist", async () => {
        const tool = createRunTestsTool(join(root, "does-not-exist"));
        const result = await tool.execute({});
        expect(result.isError).toBe(true);
    });
});