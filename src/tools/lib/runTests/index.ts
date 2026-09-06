import type { Tool } from "../../types.js";
import { execWithTimeout } from "../execWithTimeout.js";
import { resolveWithinRoot, PathScopeError } from "../pathScope.js";

const DEFAULT_TIMEOUT_MS = 120_000;

/**
 * Always invokes the project's own `npm test` script — never a freeform
 * command — so this tool has zero command-injection surface by construction.
 * Signal is the process exit code (universal across test frameworks), not
 * regex-parsed stdout (fragile, framework-specific).
 */
export function createRunTestsTool(projectRoot: string, defaultTimeoutMs = DEFAULT_TIMEOUT_MS): Tool {
    return {
        name: "runTests",
        description: "Runs the project's test suite (npm test), optionally scoped to a file/pattern, and reports pass/fail.",
        parameters: {
            type: "object",
            properties: {
                pattern: { type: "string", description: "Optional file path or pattern to scope the run (passed through to the test script)." },
                timeoutMs: { type: "integer", description: "Timeout in milliseconds before the run is killed." },
            },
        },
        async execute(args) {
            const pattern = args.pattern as string | undefined;
            const timeoutMs = (args.timeoutMs as number | undefined) ?? defaultTimeoutMs;

            let cwd: string;
            try {
                cwd = await resolveWithinRoot(projectRoot, ".");
            } catch (err) {
                if (err instanceof PathScopeError) return { isError: true, content: err.message };
                throw err;
            }

            const npmArgs = pattern ? ["test", "--", pattern] : ["test"];
            const result = await execWithTimeout("npm", npmArgs, { cwd, timeoutMs });

            if (result.timedOut) {
                return { isError: true, content: `Test run timed out after ${timeoutMs}ms.\n${result.stdout}\n${result.stderr}` };
            }

            const passed = result.code === 0;
            return {
                isError: !passed,
                content: `passed: ${passed}\nexit code: ${result.code}\n\n${result.stdout}\n${result.stderr}`,
            };
        },
    };
}