import { appState } from '../stores/appState.js';
import { ipcRenderer } from 'electron';

export async function translateWithAI(text, context, translationContext) {
  try {
    const targetLangCode = appState.targetLanguage;
    const targetLanguageMapping = { en: "English", es: "Spanish", zh: "Chinese Simplified" };
    const targetLanguage = targetLanguageMapping[targetLangCode] || "English";
    // Retrieve provider settings via ipcRenderer
    const selectedProviderId = await ipcRenderer.invoke('store-get', 'translateDefaultAiProvider', 'openai');
    const providersJson = await ipcRenderer.invoke('store-get', 'aiProviders', '[]');
    const translateAiProviders = JSON.parse(providersJson);
    const selectedProvider = translateAiProviders.find(provider => provider.id === selectedProviderId);
    if (!selectedProvider) {
      console.error(`AI Provider with ID "${selectedProviderId}" not found in settings.`);
      return `AI Provider "${selectedProviderId}" not configured.`;
    }
    const apiKey = await ipcRenderer.invoke('store-get', selectedProvider.apiKeySettingKey, '');
    const translateAiModel = await ipcRenderer.invoke('store-get', 'translateDefaultAiModel', selectedProvider.defaultModel);
    if (!apiKey) {
      console.error(`${selectedProvider.name} API key is not set. Please set it in settings.`);
      return `${selectedProvider.name} API key not set.`;
    }
    console.log("Using AI Provider:", selectedProvider.name);
    console.log("Using AI Model:", translateAiModel);
    let apiEndpoint = selectedProvider.endpoint;
    if (selectedProvider.id === 'gemini') {
      apiEndpoint = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
    } else if (selectedProvider.id === 'groq') {
      apiEndpoint = "https://api.groq.com/openai/v1/chat/completions";
    }
    const requestBody = {
      model: translateAiModel,
      messages: [{
        role: 'user',
        content: `### **Translation Guidelines**:1. **Contextual Continuity**: Use the provided context to predict and translate the next word naturally.2. **Accuracy & Brevity**: Ensure translations are concise and grammatically correct.3. **Preserve English Words**: Maintain words already in English.4. **Names & Locations**: Retain original names and locations.5. **Omit Quotation Marks**: Do not include quotation marks or extra characters.6. **Skip Ambiguous Words**: Skip words if uncertain.7. **No Redundancies**: Avoid repeating already translated words.8. **Avoid Over-translation**: Do not retranslate words already correctly translated.9. **Natural Translation**: Ensure natural phrasing.10. **Speed & Precision**: Prioritize fast, accurate translations.#### Translate the following text to ${targetLanguage}:- **Input**: Text: "${text}"- Input Context: "${context}"- Translation Context: "${translationContext}"Output:`
      }],
    };
    console.log("Sending translation request to:", apiEndpoint);
    console.log("Request body:", requestBody);
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error in translation request: ${response.status} ${response.statusText}. Response: ${errorText}`);
      return `Translation Error: ${response.statusText}`;
    }
    const result = await response.json();
    const translatedText = (result.choices && result.choices[0]?.message?.content)
      ? result.choices[0].message.content.replaceAll('"', '').replaceAll(`'`, '')
      : '';
    return translatedText.replace(/<think>.*?<\/think>/gs, '').trim();
  } catch (error) {
    console.error('Error during translation:', error.message);
    return `Translation Error: ${error.message}`;
  }
}
