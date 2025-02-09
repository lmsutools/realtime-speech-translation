
export async function translateWithAI(text, context, translationContext) {
  try {
    // Get the target language from the dropdown.
    const targetLangCode = document.getElementById('targetLanguage').value;
    const targetLanguageMapping = {
      en: "English",
      es: "Spanish",
      zh: "Chinese Simplified"
    };
    const targetLanguage = targetLanguageMapping[targetLangCode] || "English";

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{
          role: 'user',
          content: `### **Translation Guidelines**:
1. **Contextual Continuity**: Use the provided context to predict and translate the next word naturally.
2. **Accuracy & Brevity**: Ensure translations are concise and grammatically correct.
3. **Preserve English Words**: Maintain words already in English.
4. **Names & Locations**: Retain original names and locations.
5. **Omit Quotation Marks**: Do not include quotation marks or extra characters.
6. **Skip Ambiguous Words**: Skip words if uncertain.
7. **No Redundancies**: Avoid repeating already translated words.
8. **Avoid Over-translation**: Do not retranslate words already correctly translated.
9. **Natural Translation**: Ensure natural phrasing.
10. **Speed & Precision**: Prioritize fast, accurate translations.
#### **Examples**:
- Input: "महात्मा" with context "मेरा नाम" → Output: "is Mahatma"
- Input: "profesor" with context "Él es" → Output: "a teacher"
- Input: "bonjour" with context "He greeted her saying" → Output: "hello"
- Input: "Escuela" with context "Estamos en la" → Output: "school"

#### Translate the following text to ${targetLanguage}:
- **Input**: Text: "${text}"
- Input Context: "${context}"
- Translation Context: "${translationContext}"
Output:`,
        }],
      }),
    });

    if (!response.ok) {
      console.error(`Error in translation request: ${response.statusText}`);
      return '';
    }
    const { choices } = await response.json();
    return (choices[0]?.message?.content || '')
      .replaceAll('"', '')
      .replaceAll(`'`, '');
  } catch (error) {
    console.error('Error during translation:', error.message);
    return '';
  }
}
