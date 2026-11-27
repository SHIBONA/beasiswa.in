// OpenAI-compatible chat endpoints the eval can call. Free tiers and model names change often:
// check each provider's model list before a run. Keys come from the environment (.env at the repo root).
export type Provider = { baseUrl: string; keyEnv?: string; example: string; jsonMode: boolean };

export const PROVIDERS: Record<string, Provider> = {
  openrouter: { baseUrl: "https://openrouter.ai/api/v1", keyEnv: "OPENROUTER_API_KEY", example: "a model id ending in :free", jsonMode: true },
  groq: { baseUrl: "https://api.groq.com/openai/v1", keyEnv: "GROQ_API_KEY", example: "openai/gpt-oss-120b", jsonMode: true },
  gemini: { baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai", keyEnv: "GEMINI_API_KEY", example: "gemini-3.5-flash-lite", jsonMode: true },
  zai: { baseUrl: "https://api.z.ai/api/paas/v4", keyEnv: "ZAI_API_KEY", example: "a GLM Flash model id", jsonMode: true },
  qwen: { baseUrl: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1", keyEnv: "DASHSCOPE_API_KEY", example: "a Qwen model id with free quota", jsonMode: true },
  cerebras: { baseUrl: "https://api.cerebras.ai/v1", keyEnv: "CEREBRAS_API_KEY", example: "qwen-3.8-27b", jsonMode: true },
  ollama: { baseUrl: "http://localhost:11434/v1", example: "a model pulled with `ollama pull`", jsonMode: true },
};
