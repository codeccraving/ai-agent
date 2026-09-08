import type { JSONSchema } from "../providers/types.js"

export interface ValidationResult {
    valid: boolean
    errors: string[]
}

export function validateArgs(schema: JSONSchema, args: Record<string, unknown>): ValidationResult {

    const result: ValidationResult = { valid: true, errors: [] }

    if (Array.isArray(schema.required)) {
        for (const field of schema.required) {
            if (args?.[field] === undefined) {
                result.errors.push(`Missing required argument: "${field}"`)
            }
        }
    }

    for (const key in args) {
        const typeVal = schema?.properties?.[key]?.type

        if (typeVal === "string" && typeof args[key] != "string") {
            result.errors.push(`Argument "${key}" must be a string`)
        }

        if (typeVal === "integer" && !Number.isInteger(args[key])) {
            result.errors.push(`Argument "${key}" must be an integer`)
        }

        if (typeVal === "boolean") {

            if (typeof args[key] === "boolean" || (typeof args[key] === "string" && ['true', 'false'].includes(args[key].toLowerCase()))) continue

            result.errors.push(`Argument "${key}" must be a boolean`)
        }

        if (typeVal === "number") {

            if (typeof args[key] === "number") continue
            
            if (typeof args[key] === "string") {
                const v = Number(args[key])
                if (!Number.isNaN(v) && typeof v === "number") continue
            }

            result.errors.push(`Argument "${key}" must be a number`)
        }

        if (typeVal === "array" && !Array.isArray(args[key])) {
            result.errors.push(`Argument "${key}" must be an array`)
        }

        if (typeVal === "object" && !isValidObject(args[key])) {
            result.errors.push(`Argument "${key}" must be an object`)
        }
    }

    result.valid = result.errors.length == 0

    return result
}

function isValidObject(value: any) {
    return (
        value !== null &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        Object.keys(value).length > 0
    );
}