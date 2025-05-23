export const DEFAULT_PROVIDERS = [
    {
        id: 'openai',
        name: "OpenAI",
        models: ['gpt-3.5-turbo', 'o3-mini-2025-01-31', 'gpt-4o-mini'],
        defaultModel: 'gpt-3.5-turbo',
        endpoint: "https://api.openai.com/v1/chat/completions"
    },
    {
        id: 'sambanova',
        name: "SambaNova AI",
        models: ["DeepSeek-R1-Distill-Llama-70B"],
        defaultModel: "DeepSeek-R1-Distill-Llama-70B",
        endpoint: "https://api.sambanova.ai/v1/chat/completions"
    },
    {
        id: 'gemini',
        name: "Google Gemini",
        models: ["gemini-2.0-flash-001", "gemini-2.0-pro-exp-02-05"],
        defaultModel: "gemini-1.5-flash",
        endpoint: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
        isGemini: true
    },
    {
        id: 'groq',
        name: "Groq AI",
        models: ["distil-whisper-large-v3-en", "gemma2-9b-it"],
        defaultModel: "gemma2-9b-it",
        endpoint: "https://api.groq.com/openai/v1/chat/completions"
    }
];

export const VALIDATION_TIMEOUT = 10000;
export const DEBOUNCE_DELAY = 500;

export const VALIDATION_MESSAGES = {
    EMPTY_API_KEY: "API key is empty",
    PROVIDER_NOT_FOUND: "Provider not found",
    API_KEY_NOT_SET: "API key is not set",
    ENDPOINT_NOT_SET: "Provider endpoint is not set",
    REQUEST_TIMEOUT: "Request timed out",
    VALIDATING: "Validating...",
    TESTING_CONNECTION: "Testing connection to"
};

export const CSS_CLASSES = {
    VALIDATION_SUCCESS: "validation-status success",
    VALIDATION_ERROR: "validation-status error",
    VALIDATION_PENDING: "validation-status pending",
    FADE_IN: "fade-in",
    FADE_OUT: "fade-out"
};
