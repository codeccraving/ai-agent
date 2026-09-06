import type { Tool } from "../../types.js";
import { execWithTimeout } from "../execWithTimeout.js";
import { resolveWithinRoot, PathScopeError } from "../pathScope.js";

// Fixed at the code level, NOT config-driven — this is a security boundary,
// and an env var that could widen it would defeat the point. Extend this
// list deliberately as new needs come up; each addition is a one-line,
// reviewable change.
export const ALLOWED_COMMANDS = ["npm", "npx", "node", "tsc"] as const;

const DEFAULT_TIMEOUT_MS = 30_000;

export function createRunShellCommandTool(projectRoot: string, defaultTimeoutMs = DEFAULT_TIMEOUT_MS): Tool {
    return {
        name: "runShellCommand",
        description: `Runs an allow-listed command (${ALLOWED_COMMANDS.join(", ")}) inside the project root, with a timeout and captured output.`,
        parameters: {
            type: "object",
            required: ["command"],
            properties: {
                command: { type: "string", enum: [...ALLOWED_COMMANDS], description: "The binary to run." },
                args: { type: "array", items: { type: "string" }, description: "Arguments to pass to the command." },
                timeoutMs: { type: "integer", description: "Timeout in milliseconds before the process is killed." },
            },
        },
        async execute(args) {
            const command = args.command as string;
            const cmdArgs = (args.args as string[] | undefined) ?? [];
            const timeoutMs = (args.timeoutMs as number | undefined) ?? defaultTimeoutMs;

            // Checked BEFORE anything is spawned.
            if (!ALLOWED_COMMANDS.includes(command as any)) {
                return { isError: true, content: `Command "${command}" is not allow-listed. Allowed: ${ALLOWED_COMMANDS.join(", ")}` };
            }

            try {
                // cwd is always the project root — never derived from `args` —
                // so there's no path to escape here in the first place.
                const cwd = await resolveWithinRoot(projectRoot, ".");
                const result = await execWithTimeout(command, cmdArgs, { cwd, timeoutMs });

                if (result.timedOut) {
                    return { isError: true, content: `Command timed out after ${timeoutMs}ms.\nstdout: ${result.stdout}\nstderr: ${result.stderr}` };
                }

                return {
                    isError: result.code !== 0,
                    content: `exit code: ${result.code}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
                };
            } catch (err) {
                if (err instanceof PathScopeError) {
                    return { isError: true, content: err.message };
                }
                const msg = err instanceof Error ? err.message : String(err);
                return { isError: true, content: `Failed to run "${command}": ${msg}` };
            }
        },
    };
}