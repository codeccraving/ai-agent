import { loadEnvFile } from 'node:process'
import type { AppConfig } from '../src/config/types.js'
import { loadConfig } from '../src/config/loadConfig.js'
loadEnvFile()

async function checkOllama() {

    let config: AppConfig
    try {
        config = loadConfig()
    } catch (e) {
        console.error((e as Error).message)
        process.exit(1) // Failed
    }

    try {
        const response = await fetch(`${config.llm.ollama.baseUrl}/api/tags`)

        if (!response.ok) {
            throw new Error(`Ollama server returned status ${response.status}`)
        }

        const data = await response.json()

        if (!JSON.stringify(data).match(new RegExp(`"${config.llm.ollama.model}"`))) {
            console.error(`Model ${config.llm.ollama.model} not found in available tags`)
            process.exit(1)
        }

        console.log("Successfully connected to Ollama server. Available models:", data?.models ? data?.models?.map((model: any) => model.name).join(", ") : "No models found")

    } catch (e) {
        console.error("Error connecting to Ollama server:", e)
        process.exit(1)
    }
}

checkOllama()
