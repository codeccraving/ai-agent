import type { Tool } from "../../types.js";
import { resolveWithinRoot } from "../pathScope.js";
import { readFile } from "node:fs/promises";

export function createReadFileTool(projectRoot: string): Tool {

    return {
        name: 'readFile',
        description: 'Reads the contents of a file.',
        parameters: {
            type: 'object',
            required: ['path'],
            properties: {
                path: { type: 'string', description: 'The path to the file to read' }
            }
        },
        async execute(args) {

            if (!args.path || typeof args.path !== 'string') {
                return { isError: true, content: "Invalid or missing 'path' argument" }
            }

            try {
                const resolvedPath = await resolveWithinRoot(projectRoot, args.path)
                const fileContents = await readFile(resolvedPath, 'utf8')
                return { isError: false, content: fileContents }

            } catch (error) {
                return { isError: true, content: `Error reading file: ${error instanceof Error ? error.message : String(error)}` }
            }

        },
    }

}