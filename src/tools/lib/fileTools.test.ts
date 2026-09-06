import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readFile as fsReadFile, writeFile as fsWriteFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createReadFileTool } from "./readFile/index.js";
import { createWriteFileTool } from "./writeFile/index.js";

describe("readFile tool", () => {
    let root: string;

    beforeEach(async () => {
        root = await mkdtemp(join(tmpdir(), "readfile-"));
        await mkdir(join(root, "src"), { recursive: true });
        await fsWriteFile(join(root, "src", "hello.ts"), "export const x = 1;");
    });

    afterEach(async () => {
        await rm(root, { recursive: true, force: true });
    });

    it("has the correct name and requires a path", () => {
        const tool = createReadFileTool(root);
        expect(tool.name).toBe("readFile");
        expect(tool.parameters.required).toEqual(["path"]);
    });

    it("reads a file inside the project root", async () => {
        const tool = createReadFileTool(root);
        const result = await tool.execute({ path: "src/hello.ts" });
        expect(result.isError).toBeFalsy();
        expect(result.content).toBe("export const x = 1;");
    });

    it("returns a tool error (not a throw) for a missing file", async () => {
        const tool = createReadFileTool(root);
        const result = await tool.execute({ path: "src/missing.ts" });
        expect(result.isError).toBe(true);
    });

    it("returns a tool error for a path that escapes the project root", async () => {
        const tool = createReadFileTool(root);
        const result = await tool.execute({ path: "../../etc/passwd" });
        expect(result.isError).toBe(true);
        expect(result.content).toMatch(/outside project root/);
    });

    it("is never destructive", () => {
        const tool = createReadFileTool(root);
        expect(tool.isDestructive).toBeUndefined();
    });
});

describe("writeFile tool", () => {
    let root: string;

    beforeEach(async () => {
        root = await mkdtemp(join(tmpdir(), "writefile-"));
    });

    afterEach(async () => {
        await rm(root, { recursive: true, force: true });
    });

    it("classifies a real write as destructive", () => {
        const tool = createWriteFileTool(root);
        expect(tool.isDestructive!({ path: "a.ts", content: "x" })).toBe(true);
    });

    it("classifies a dryRun write as non-destructive", () => {
        const tool = createWriteFileTool(root);
        expect(tool.isDestructive!({ path: "a.ts", content: "x", dryRun: true })).toBe(false);
    });

    it("dryRun does not touch the filesystem", async () => {
        const tool = createWriteFileTool(root);
        const result = await tool.execute({ path: "new.ts", content: "hello", dryRun: true });
        expect(result.content).toMatch(/dry run/i);
        await expect(fsReadFile(join(root, "new.ts"), "utf-8")).rejects.toThrow();
    });

    it("writes a new file and creates parent directories", async () => {
        const tool = createWriteFileTool(root);
        const result = await tool.execute({ path: "nested/dir/new.ts", content: "hello world" });
        expect(result.isError).toBeFalsy();
        const written = await fsReadFile(join(root, "nested", "dir", "new.ts"), "utf-8");
        expect(written).toBe("hello world");
    });

    it("overwrites an existing file", async () => {
        await fsWriteFile(join(root, "existing.ts"), "old content");
        const tool = createWriteFileTool(root);
        await tool.execute({ path: "existing.ts", content: "new content" });
        const written = await fsReadFile(join(root, "existing.ts"), "utf-8");
        expect(written).toBe("new content");
    });

    it("rejects a write that escapes the project root", async () => {
        const tool = createWriteFileTool(root);
        const result = await tool.execute({ path: "../../etc/escape.txt", content: "pwned" });
        expect(result.isError).toBe(true);
        expect(result.content).toMatch(/outside project root/);
    });
});