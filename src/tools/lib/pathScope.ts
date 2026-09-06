import { resolve, sep, isAbsolute } from "node:path";
import { realpath } from "node:fs/promises";
import { existsSync } from "node:fs";

export class PathScopeError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "PathScopeError";
    }
}

export async function resolveWithinRoot(root: string, userPath: string): Promise<string> {
    const absRoot = resolve(root);
    // Step 0: where would this path land, ignoring symlinks for now?
    // Handles both "sub/file.ts" and an already-absolute path.
    const candidate = isAbsolute(userPath) ? resolve(userPath) : resolve(absRoot, userPath);
    // Step 1: back up folder by folder from `candidate` until we're standing
    // on something that actually exists on disk (root itself always does).
    let probe = candidate;
    while (!existsSync(probe)) {
        const parent = resolve(probe, "..");
        if (parent === probe) break; // hit filesystem root, give up backing up further
        probe = parent;
    }

    // Step 2: now that we're on real ground, check it for fake doors
    // (symlinks) by asking the OS for the TRUE location. This is the part
    // a plain string check can't do — realpath() actually follows symlinks.
    let realRoot: string;
    let realProbe: string;
    try {
        realRoot = await realpath(absRoot);
        realProbe = existsSync(probe) ? await realpath(probe) : probe;
    } catch (e) {
        throw new PathScopeError(`Project root does not exist or is inaccessible: "${absRoot}"`);
    }

    // Step 3: glue the not-yet-built part of the path back onto the
    // real (symlink-resolved) location we just verified.
    const rebased = candidate.replace(probe, realProbe);

    // Step 4: is the final, fully-real location still inside root?
    if (rebased !== realRoot && !rebased.startsWith(realRoot + sep)) {
        throw new PathScopeError(`"${userPath}" resolves outside project root "${absRoot}"`);
    }

    return rebased;
}