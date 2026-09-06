import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile, appendFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execWithTimeout } from "../execWithTimeout.js";
import { createGitTool } from "./index.js";

async function initRepo(root: string) {
    await execWithTimeout("git", ["init", "-q"], { cwd: root, timeoutMs: 5000 });
    await execWithTimeout("git", ["config", "user.email", "test@test.com"], { cwd: root, timeoutMs: 5000 });
    await execWithTimeout("git", ["config", "user.name", "Test"], { cwd: root, timeoutMs: 5000 });
    await writeFile(join(root, "file.txt"), "hello\n");
    await execWithTimeout("git", ["add", "file.txt"], { cwd: root, timeoutMs: 5000 });
    await execWithTimeout("git", ["commit", "-q", "-m", "initial"], { cwd: root, timeoutMs: 5000 });
}

describe("git tool", () => {
    let root: string;

    beforeEach(async () => {
        root = await mkdtemp(join(tmpdir(), "gittool-"));
        await initRepo(root);
    });

    afterEach(async () => {
        await rm(root, { recursive: true, force: true });
    });

    describe("destructiveness classification (pure, no I/O)", () => {
        it("status is not destructive", () => {
            const tool = createGitTool(root);
            expect(tool.isDestructive!({ operation: "status" })).toBe(false);
        });

        it("diff is not destructive", () => {
            const tool = createGitTool(root);
            expect(tool.isDestructive!({ operation: "diff" })).toBe(false);
        });

        it("commit is destructive", () => {
            const tool = createGitTool(root);
            expect(tool.isDestructive!({ operation: "commit", message: "x" })).toBe(true);
        });

        it("branch list is not destructive", () => {
            const tool = createGitTool(root);
            expect(tool.isDestructive!({ operation: "branch", branchAction: "list" })).toBe(false);
        });

        it("branch create is destructive", () => {
            const tool = createGitTool(root);
            expect(tool.isDestructive!({ operation: "branch", branchAction: "create", branchName: "x" })).toBe(true);
        });

        it("branch checkout is destructive", () => {
            const tool = createGitTool(root);
            expect(tool.isDestructive!({ operation: "branch", branchAction: "checkout", branchName: "x" })).toBe(true);
        });
    });

    describe("execution", () => {
        it("reports clean status", async () => {
            const tool = createGitTool(root);
            const result = await tool.execute({ operation: "status" });
            expect(result.isError).toBeFalsy();
            expect(result.content).toBe("(clean)");
        });

        it("reports a modified file in status", async () => {
            await appendFile(join(root, "file.txt"), "world\n");
            const tool = createGitTool(root);
            const result = await tool.execute({ operation: "status" });
            expect(result.content).toContain("file.txt");
        });

        it("shows a diff for unstaged changes", async () => {
            await appendFile(join(root, "file.txt"), "world\n");
            const tool = createGitTool(root);
            const result = await tool.execute({ operation: "diff" });
            expect(result.content).toContain("+world");
        });

        it("requires a message for commit", async () => {
            const tool = createGitTool(root);
            const result = await tool.execute({ operation: "commit" });
            expect(result.isError).toBe(true);
            expect(result.content).toMatch(/message is required/);
        });

        it("commits staged changes", async () => {
            await appendFile(join(root, "file.txt"), "world\n");
            await execWithTimeout("git", ["add", "-A"], { cwd: root, timeoutMs: 5000 });
            const tool = createGitTool(root);
            const result = await tool.execute({ operation: "commit", message: "second commit" });
            expect(result.isError).toBeFalsy();

            const log = await execWithTimeout("git", ["log", "--oneline"], { cwd: root, timeoutMs: 5000 });
            expect(log.stdout).toContain("second commit");
        });

        it("creates a branch", async () => {
            const tool = createGitTool(root);
            await tool.execute({ operation: "branch", branchAction: "create", branchName: "feature-x" });
            const list = await tool.execute({ operation: "branch", branchAction: "list" });
            expect(list.content).toContain("feature-x");
        });

        it("rejects a branch name that isn't valid, without any shell side effects", async () => {
            const tool = createGitTool(root);
            const result = await tool.execute({ operation: "branch", branchAction: "create", branchName: "bad; rm -rf /tmp/whatever" });
            expect(result.isError).toBe(true);
        });

        it("checks out a branch", async () => {
            const tool = createGitTool(root);
            await tool.execute({ operation: "branch", branchAction: "create", branchName: "feature-y" });
            const result = await tool.execute({ operation: "branch", branchAction: "checkout", branchName: "feature-y" });
            expect(result.isError).toBeFalsy();
        });

        it("requires branchAction for operation branch", async () => {
            const tool = createGitTool(root);
            const result = await tool.execute({ operation: "branch" });
            expect(result.isError).toBe(true);
        });
    });
});