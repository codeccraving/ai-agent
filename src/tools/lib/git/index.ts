import type { Tool } from "../../types.js";
import { execWithTimeout } from "../execWithTimeout.js";
import { resolveWithinRoot, PathScopeError } from "../pathScope.js";

const DEFAULT_TIMEOUT_MS = 15_000;

type GitOperation = "status" | "diff" | "commit" | "branch";
type BranchAction = "list" | "create" | "checkout";

export function createGitTool(projectRoot: string, defaultTimeoutMs = DEFAULT_TIMEOUT_MS): Tool {
    return {
        name: "git",
        description: "Runs a scoped git operation (status, diff, commit, branch) inside the project root.",
        parameters: {
            type: "object",
            required: ["operation"],
            properties: {
                operation: { type: "string", enum: ["status", "diff", "commit", "branch"], description: "Which git operation to perform." },
                message: { type: "string", description: "Commit message. Required when operation is 'commit'." },
                branchAction: { type: "string", enum: ["list", "create", "checkout"], description: "Required when operation is 'branch'." },
                branchName: { type: "string", description: "Required when branchAction is 'create' or 'checkout'." },
            },
        },
        // Only args that actually mutate history / working tree are destructive.
        // status/diff/branch-list are read-only and auto-execute.
        isDestructive(args) {
            const operation = args.operation as GitOperation;
            if (operation === "commit") return true;
            if (operation === "branch") {
                const branchAction = args.branchAction as BranchAction | undefined;
                return branchAction === "create" || branchAction === "checkout";
            }
            return false;
        },
        async execute(args) {
            const operation = args.operation as GitOperation;

            let cwd: string;
            try {
                cwd = await resolveWithinRoot(projectRoot, ".");
            } catch (err) {
                if (err instanceof PathScopeError) return { isError: true, content: err.message };
                throw err;
            }

            const run = (gitArgs: string[]) => execWithTimeout("git", gitArgs, { cwd, timeoutMs: defaultTimeoutMs });

            if (operation === "status") {
                const r = await run(["status", "--porcelain"]);
                return { isError: r.code !== 0, content: r.stdout || r.stderr || "(clean)" };
            }

            if (operation === "diff") {
                const r = await run(["diff"]);
                return { isError: r.code !== 0, content: r.stdout || r.stderr || "(no changes)" };
            }

            if (operation === "commit") {
                const message = args.message as string | undefined;
                if (!message) {
                    return { isError: true, content: "message is required for operation 'commit'" };
                }
                const r = await run(["commit", "-m", message]);
                return { isError: r.code !== 0, content: r.stdout || r.stderr };
            }

            if (operation === "branch") {
                const branchAction = args.branchAction as BranchAction | undefined;
                if (!branchAction) {
                    return { isError: true, content: "branchAction is required for operation 'branch'" };
                }
                if (branchAction === "list") {
                    const r = await run(["branch", "--list"]);
                    return { isError: r.code !== 0, content: r.stdout || r.stderr };
                }
                const branchName = args.branchName as string | undefined;
                if (!branchName) {
                    return { isError: true, content: `branchName is required when branchAction is '${branchAction}'` };
                }
                if (branchAction === "create") {
                    const r = await run(["branch", branchName]);
                    return { isError: r.code !== 0, content: r.stdout || r.stderr || `Created branch "${branchName}"` };
                }
                // checkout
                const r = await run(["checkout", branchName]);
                return { isError: r.code !== 0, content: r.stdout || r.stderr };
            }

            return { isError: true, content: `Unknown operation: ${operation}` };
        },
    };
}