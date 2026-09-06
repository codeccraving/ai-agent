import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtemp, mkdir, writeFile, symlink, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolveWithinRoot, PathScopeError } from "./pathScope.js";

describe("resolveWithinRoot", () => {
    let root: string;
    let outside: string;

    beforeAll(async () => {
        const base = await mkdtemp(join(tmpdir(), "pathscope-"));
        root = join(base, "root");
        outside = join(base, "outside");
        await mkdir(join(root, "sub"), { recursive: true });
        await mkdir(outside, { recursive: true });
        await writeFile(join(outside, "secret.txt"), "top secret");
        await symlink(outside, join(root, "sub", "escape_link"));
    });

    afterAll(async () => {
        await rm(join(root, ".."), { recursive: true, force: true });
    });

    it("resolves a simple relative path inside root", async () => {
        const result = await resolveWithinRoot(root, "sub/file.ts");
        expect(result).toBe(join(root, "sub", "file.ts"));
    });

    it("resolves a path that doesn't exist yet (new file, new dirs)", async () => {
        const result = await resolveWithinRoot(root, "newdir/nested/newfile.ts");
        expect(result).toBe(join(root, "newdir", "nested", "newfile.ts"));
    });

    it("normalizes internal .. that stays within root", async () => {
        const result = await resolveWithinRoot(root, "sub/../sub/file.ts");
        expect(result).toBe(join(root, "sub", "file.ts"));
    });

    it("rejects .. traversal that escapes root", async () => {
        await expect(resolveWithinRoot(root, "../../etc/passwd")).rejects.toThrow(PathScopeError);
    });

    it("rejects an absolute path outside root", async () => {
        await expect(resolveWithinRoot(root, "/etc/passwd")).rejects.toThrow(PathScopeError);
    });

    it("accepts an absolute path that happens to resolve inside root", async () => {
        const result = await resolveWithinRoot(root, join(root, "sub", "file.ts"));
        expect(result).toBe(join(root, "sub", "file.ts"));
    });

    it("rejects traversal through a symlink that points outside root", async () => {
        await expect(resolveWithinRoot(root, "sub/escape_link/secret.txt")).rejects.toThrow(PathScopeError);
    });

    it("rejects when root itself does not exist", async () => {
        await expect(resolveWithinRoot(join(root, "does-not-exist-root"), "file.ts")).rejects.toThrow(PathScopeError);
    });
});