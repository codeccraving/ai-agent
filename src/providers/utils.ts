import type { Provider } from "../config/types.js";
import { DEFAULT_TIMEOUT_MS, type ChatResponse } from "./types.js";

export async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export function generateChatResponse(provider: Provider, data: any): ChatResponse | null {

  switch (provider) {
    case 'ollama':
      return {
        model: data.model,
        content: data?.message?.content ?? "",
        finishReason: data?.done_reason ?? "stop",
        usage: {
          promptTokens: data?.prompt_eval_count,
          completionTokens: data?.eval_count,
          totalTokens: data?.prompt_eval_count + data?.eval_count
        }
      }
    default:
      return null
  }

}