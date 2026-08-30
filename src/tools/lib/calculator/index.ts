import type { Tool } from "../../types.js";

export const calculatorTool: Tool = {
    name: 'calculator',
    description: 'Performs basic arithmetic (add, subtract, multiply, divide) on two numbers.',
    parameters: {
        type: 'object',
        required: ['operation', 'a', 'b'],
        properties: {
            operation: { type: 'string', enum: ['add', 'subtract', 'multiply', 'divide'], description: 'The arithmetic operation to perform' },
            a: { type: 'number', description: 'The first operand' },
            b: { type: 'number', description: 'The second operand' },
        },
    },
    async execute(args) {

        if (!['add', 'subtract', 'multiply', 'divide'].includes(args.operation as string)) {
            return { isError: true, content: "Invalid operation" }
        }

        const a = args.a as number
        const b = args.b as number

        if (args.operation === "add") {
            return { content: (a + b).toString() }
        } else if (args.operation === "subtract") {
            return { content: (a - b).toString() }
        } else if (args.operation === "multiply") {
            return { content: (a * b).toString() }
        } else {
            if (b == 0) {
                return { content: "Division by zero", isError: true }
            } else {
                return { content: (a / b).toString() }
            }
        }
    },
}