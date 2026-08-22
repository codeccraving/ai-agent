import type { AppConfig } from "../config/types.js";
import { OllamaProvider } from "./ollama.js";
import { ProviderError, type ChatProvider } from "./types.js";

export function createProvider(config: AppConfig): ChatProvider {
    switch (config.llm.provider) {
        case 'ollama':
            return new OllamaProvider(config.llm.raw);
        default:
            throw new ProviderError('invalid_request', `Unsupported provider: ${config.llm.provider}`);
    }
}