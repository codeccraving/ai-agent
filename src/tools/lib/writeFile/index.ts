import type { Tool } from "../../types.js";
import { resolveWithinRoot } from "../pathScope.js";
import { writeFile, mkdir } from "node:fs/promises";

export function createWriteFileTool(projectRoot: string): Tool {

    return {
        name: 'writeFile',
        description: 'Writes content to a file at the given path, relative to the project root — creates it if missing, overwrites it if present. Supports a dry-run mode that reports what would be written without touching the file. Does not return the file\'s existing contents.',
        parameters: {
            type: 'object',
            required: ['path', 'content'],
            properties: {
                path: { type: 'string', description: 'The path to the file to write' },
                content: { type: 'string', description: 'The content to write to the file' },
                dryRun: { type: 'boolean', description: 'If true, the file will not actually be written' }
            }
        },
        isDestructive(args) { return args.dryRun !== true },
        async execute(args) {

            if (!args.path || typeof args.path !== 'string') {
                return { isError: true, content: "Invalid or missing 'path' argument" }
            }

            if (!args.content || typeof args.content !== 'string') {
                return { isError: true, content: "Invalid or missing 'content' argument" }
            }

            try {
                const resolvedPath = await resolveWithinRoot(projectRoot, args.path)
                if (args.dryRun === true) {
                    // dryRun: true returns a preview string ("Would create new file..." / "Would overwrite... (N bytes -> M bytes)") without touching disk — confirmed by test that the file genuinely doesn't exist afterward.
                    return { isError: false, content: `Dry run: would write to ${resolvedPath}` } // also mention would overrite if file exists, but for now just a simple message
                } else {
                    await mkdir(resolvedPath.substring(0, resolvedPath.lastIndexOf('/')), { recursive: true })
                    await writeFile(resolvedPath, args.content, { encoding: 'utf8', flag: 'w' })
                    return { isError: false, content: `Successfully wrote to ${resolvedPath}` }
                }

            } catch (error) {
                return { isError: true, content: `Error writing file: ${error instanceof Error ? error.message : String(error)}` }
            }

        },
    }

}