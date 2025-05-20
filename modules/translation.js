import { ipcRenderer } from 'electron';

/**
* Validate translation configuration
* @returns {Object} Object with valid flag and message
*/
export async function validateTranslationConfig() {
  try {
    const aiProviders = await getAIProviders();
    if (!aiProviders || aiProviders.length === 0) {
      return {
        valid: false,
        message: "No AI providers configured. Please set up an AI provider in settings."
      };
    }

    const defaultProviderId = await ipcRenderer.invoke('store-get', 'translateDefaultAiProvider', '');
    if (!defaultProviderId) {
      return {
        valid: false,
        message: "No default AI provider selected. Please select a default provider in settings."
      };
    }

    const provider = aiProviders.find(p => p.id === defaultProviderId);
    if (!provider) {
      return {
        valid: false,
        message: `Selected provider '${defaultProviderId}' not found. Please check your settings.`
      };
    }

    const apiKey = await ipcRenderer.invoke('store-get', provider.apiKeySettingKey, '');
    if (!apiKey) {
      return {
        valid: false,
        message: `API key for ${provider.name} is not set. Please add it in the API Keys settings.`
      };
    }

    return { valid: true };
  } catch (error) {
    console.error('[Translation] Config validation error:', error);
    return {
      valid: false,
      message: `Error validating translation config: ${error.message}`
    };
  }
}

/**
* Get AI providers
*/
async function getAIProviders() {
  const storedProviders = await ipcRenderer.invoke('store-get', 'aiProviders', null);
  if (!storedProviders) return [];
  try {
    return JSON.parse(storedProviders);
  } catch (e) {
    console.error("Error parsing stored aiProviders:", e);
    return [];
  }
}

/**
* Build the AI prompt for translation
*/
function buildTranslationPrompt(text, context, previousTranslations, targetLanguage) {
  return {
    system: `You are a professional translator. Translate the given text to ${targetLanguage}.
Maintain the same tone, style, and intent of the original.
If there are multiple speakers, preserve the speaker shifts in your translation.
Respond ONLY with the translation, nothing else.`,
    messages: [
      {
        role: "user",
        content: `Translate this text to ${targetLanguage}: "${text}"
${context ? `\nContext (previous sentences for reference): ${context}` : ''}
${previousTranslations ? `\nPrevious translations: ${previousTranslations}` : ''}`
      }
    ]
  };
}

/**
* Translate text using the configured AI provider
*/
export async function translateWithAI(text, context = '', previousTranslations = '') {
  console.log('[Translation] Starting translation for:', text);
  try {
    // Update translation status in UI
    const translatedTextElement = document.getElementById('translated-text');
    if (translatedTextElement) {
      const statusIndicator = document.createElement('div');
      statusIndicator.className = 'translation-status';
      statusIndicator.textContent = 'Translating...';
      translatedTextElement.appendChild(statusIndicator);
      // Force UI update
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    // Validate config first
    const validationResult = await validateTranslationConfig();
    if (!validationResult.valid) {
      console.error('[Translation] Invalid config:', validationResult.message);
      return `Translation Error: ${validationResult.message}`;
    }

    const aiProviders = await getAIProviders();
    const defaultProviderId = await ipcRenderer.invoke('store-get', 'translateDefaultAiProvider', 'openai');
    const provider = aiProviders.find(p => p.id === defaultProviderId);
    if (!provider) {
      console.error('[Translation] Provider not found:', defaultProviderId);
      return "Translation Error: Selected AI provider not found";
    }

    const apiKey = await ipcRenderer.invoke('store-get', provider.apiKeySettingKey, '');
    const defaultModel = await ipcRenderer.invoke('store-get', 'translateDefaultAiModel', provider.defaultModel);
    const targetLanguage = await ipcRenderer.invoke('store-get', 'targetLanguage', 'en');
    console.log(`[Translation] Using provider: ${provider.name}, model: ${defaultModel}, endpoint: ${provider.endpoint}`);

    // Format differently for Gemini
    const isGemini = !!provider.isGemini;
    const endpoint = provider.endpoint;
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    };

    const prompt = buildTranslationPrompt(text, context, previousTranslations, targetLanguage);

    // Different request formats for different providers
    let requestBody;
    if (isGemini) {
      requestBody = {
        model: defaultModel,
        messages: [
          {
            role: "system",
            content: prompt.system
          },
          ...prompt.messages
        ],
        temperature: 0.3,
        max_tokens: 1024
      };
    } else {
      // Standard OpenAI compatible format
      requestBody = {
        model: defaultModel,
        messages: [
          {
            role: "system",
            content: prompt.system
          },
          ...prompt.messages
        ],
        temperature: 0.3,
        max_tokens: 1024
      };
    }

    console.log('[Translation] Sending request to:', endpoint);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.text();
        console.error(`[Translation] API error (${response.status}):`, errorData);
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('[Translation] Response data:', data);

      // Extract response text based on API format
      let translatedText;
      if (data.choices && data.choices[0] && data.choices[0].message) {
        translatedText = data.choices[0].message.content;
      } else if (data.content) {
        translatedText = data.content;
      } else if (data.text) {
        translatedText = data.text;
      } else {
        console.error('[Translation] Unknown response format:', data);
        throw new Error('Unknown API response format');
      }

      // Clean up any quotes
      translatedText = translatedText.replace(/^["']|["']$/g, '');
      console.log('[Translation] Final translated text:', translatedText);

      return translatedText;
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        throw new Error('Request timed out after 30 seconds');
      }
      throw fetchError;
    }
  } catch (error) {
    console.error('[Translation] Error during translation:', error);
    return `Translation Error: ${error.message}`;
  } finally {
    // Remove status indicators
    const translatedTextElement = document.getElementById('translated-text');
    if (translatedTextElement) {
      const statusElements = translatedTextElement.querySelectorAll('.translation-status');
      statusElements.forEach(elem => {
        if (elem.parentNode === translatedTextElement) {
          elem.parentNode.removeChild(elem);
        }
      });
    }
  }
}