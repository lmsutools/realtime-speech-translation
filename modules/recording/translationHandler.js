import { translateWithAI, validateTranslationConfig } from '../translation.js';
import { pasteText } from '../utils.js';
import { recordingState } from './recordingState.js';
import { buildHTMLTranscript, countSentenceEnders } from './paragraphBuilder.js';
import { UIUpdater } from './uiUpdater.js';
import { appState } from '../../stores/appState.js'; // MobX appState

export class TranslationHandler {

    static extractCurrentSpeakerId() {
        if (recordingState.finalParagraphs.length > 0) {
            return recordingState.finalParagraphs[recordingState.finalParagraphs.length - 1].speaker;
        }
        // Fallback logic if needed, though ideally finalParagraphs should be up-to-date
        const sourceTextElement = document.getElementById('source-text');
        if (sourceTextElement) {
            const speakerSpans = sourceTextElement.querySelectorAll('span[style*="background-color"]');
            if (speakerSpans.length > 0) {
                const lastSpeakerSpan = speakerSpans[speakerSpans.length - 1];
                const speakerMatch = /speaker\s+(\d+)/i.exec(lastSpeakerSpan.textContent);
                if (speakerMatch && speakerMatch[1]) {
                    return parseInt(speakerMatch[1]);
                }
            }
        }
        return 0; // Default speaker
    }

    static async handleFinalTranscriptSegment(transcript) {
        if (!transcript.trim()) {
            console.log('[TranslationHandler] Empty transcript segment, skipping.');
            return;
        }

        console.log(`[TranslationHandler] Processing final transcript segment: "${transcript}"`);
        recordingState.transcriptions.push(transcript);
        if (recordingState.transcriptions.length > 10) {
            recordingState.transcriptions.shift();
        }

        let currentTranslation = null;

        // --- Translation Display Logic (Independent of Typing/Pasting) ---
        if (appState.enableTranslation) {
            if (recordingState.isTranslating) {
                console.log('[TranslationHandler] Translation already in progress for a previous segment, skipping new translation for this one.');
            } else {
                const configValid = await validateTranslationConfig();
                if (!configValid.valid) {
                    console.error('[TranslationHandler] Translation config invalid:', configValid.message);
                    UIUpdater.updateTranslationStatus(configValid.message, true);
                    // Optionally update the UI to show the source text in the translation pane as a fallback
                    // this.updateTranslationUIWithSource(transcript); 
                } else {
                    try {
                        recordingState.isTranslating = true;
                        UIUpdater.updateTranslationStatus("Translating...");
                        console.log('[TranslationHandler] Starting translation process for UI display...');
                        
                        currentTranslation = await translateWithAI(
                            transcript,
                            recordingState.transcriptions.join(' '), // Context
                            recordingState.translations.join(' ')    // Previous translations
                        );
                        console.log(`[TranslationHandler] Translation result for UI: "${currentTranslation}"`);

                        if (currentTranslation.startsWith("Translation Error:")) {
                            console.error(`[TranslationHandler] Translation for UI failed: "${currentTranslation}"`);
                            UIUpdater.updateTranslationStatus(currentTranslation, true);
                            // this.updateTranslationUIWithSource(transcript); // Fallback display
                        } else {
                            console.log(`[TranslationHandler] Translation for UI succeeded: "${currentTranslation}"`);
                            await this.updateMainTranslationUI(currentTranslation); // Update main window's translation pane
                            recordingState.translations.push(currentTranslation);
                            if (recordingState.translations.length > 10) {
                                recordingState.translations.shift();
                            }
                        }
                    } catch (error) {
                        console.error('[TranslationHandler] Error during UI translation:', error);
                        UIUpdater.updateTranslationStatus(`Translation Error: ${error.message}`, true);
                        // this.updateTranslationUIWithSource(transcript); // Fallback display
                    } finally {
                        recordingState.isTranslating = false;
                    }
                }
            }
        } else {
            // If translation is not enabled, ensure the translation pane is clear or shows a message
            // UIUpdater.updateTranslatedText(''); // Or a placeholder like "Translation disabled"
        }

        // --- Typing/Pasting Logic (For Typing App) ---
        if (recordingState.typingActive) {
            const pasteOption = document.getElementById('pasteOption').value;
            console.log(`[TranslationHandler] Typing App active. Paste option: "${pasteOption}"`);

            if (pasteOption === 'source') {
                console.log(`[TranslationHandler] Typing source text: "${transcript}"`);
                await pasteText(transcript);
            } else if (pasteOption === 'translated') {
                if (appState.enableTranslation) {
                    if (currentTranslation && !currentTranslation.startsWith("Translation Error:")) {
                        // Use the translation we just got for the UI
                        console.log(`[TranslationHandler] Typing translated text (already available): "${currentTranslation}"`);
                        await pasteText(currentTranslation);
                    } else if (!recordingState.isTranslating) { 
                        // If UI translation wasn't running or failed, and we need to translate specifically for typing
                        console.log('[TranslationHandler] Translation needed specifically for typing. Re-validating config...');
                        const configValidForTyping = await validateTranslationConfig();
                        if (!configValidForTyping.valid) {
                            console.error('[TranslationHandler] Typing translation config invalid:', configValidForTyping.message);
                            UIUpdater.updateTranslationStatus(`Typing Error: ${configValidForTyping.message}`, true);
                            console.log(`[TranslationHandler] Fallback: Typing source text due to translation config error: "${transcript}"`);
                            await pasteText(transcript); // Fallback to source
                        } else {
                            try {
                                // Avoid setting global isTranslating flag here if it's a separate attempt
                                UIUpdater.updateTranslationStatus("Translating for typing..."); // Temporary status
                                const translationForTyping = await translateWithAI(
                                    transcript,
                                    recordingState.transcriptions.join(' '),
                                    recordingState.translations.join(' ')
                                );
                                if (translationForTyping.startsWith("Translation Error:")) {
                                    console.error(`[TranslationHandler] Typing translation failed: "${translationForTyping}"`);
                                    UIUpdater.updateTranslationStatus(translationForTyping, true);
                                    console.log(`[TranslationHandler] Fallback: Typing source text due to translation error: "${transcript}"`);
                                    await pasteText(transcript); // Fallback to source
                                } else {
                                    console.log(`[TranslationHandler] Typing translated text (newly fetched): "${translationForTyping}"`);
                                    await pasteText(translationForTyping);
                                }
                            } catch (error) {
                                console.error('[TranslationHandler] Error during typing-specific translation:', error);
                                UIUpdater.updateTranslationStatus(`Typing Translation Error: ${error.message}`, true);
                                console.log(`[TranslationHandler] Fallback: Typing source text due to translation exception: "${transcript}"`);
                                await pasteText(transcript); // Fallback to source
                            }
                        }
                    } else {
                         console.log('[TranslationHandler] Translation for UI is in progress or failed, fallback to typing source for now.');
                         await pasteText(transcript); // Fallback while UI translation is busy or failed
                    }
                } else {
                    console.log('[TranslationHandler] Translation not enabled, typing source text instead for "Type the Translation" option.');
                    await pasteText(transcript); // Fallback to source if translation isn't enabled
                }
            } else if (pasteOption === 'none') {
                console.log('[TranslationHandler] Typing App active, but "No Typing" selected.');
            }
        }
    }
    
    // Helper to update the main UI's translation pane
    static async updateMainTranslationUI(translatedTextSegment) {
        if (appState.diarizationEnabled) {
            const speakerId = this.extractCurrentSpeakerId();
            const translatedParagraph = {
                speaker: speakerId,
                text: translatedTextSegment,
                endTime: 0, // Not strictly necessary for display only
                sentenceCount: countSentenceEnders(translatedTextSegment)
            };
            // Append to a list of paragraphs for the translation pane
            recordingState.translationParagraphs.push(translatedParagraph);
            const translationHTML = buildHTMLTranscript(recordingState.translationParagraphs, []);
            UIUpdater.updateTranslatedText(translationHTML, false); // Replace content
        } else {
            // Append plain text for non-diarized translations
            UIUpdater.updateTranslatedText(translatedTextSegment, true); // Append content
        }
    }

    // Optional: Helper if you want to show source in translation pane on error
    static updateTranslationUIWithSource(sourceTranscriptSegment) {
        if (appState.diarizationEnabled) {
            const speakerId = this.extractCurrentSpeakerId();
            const sourceAsTranslatedParagraph = {
                speaker: speakerId,
                text: `(Source as fallback): ${sourceTranscriptSegment}`,
                endTime: 0,
                sentenceCount: countSentenceEnders(sourceTranscriptSegment)
            };
            recordingState.translationParagraphs.push(sourceAsTranslatedParagraph);
            const translationHTML = buildHTMLTranscript(recordingState.translationParagraphs, []);
            UIUpdater.updateTranslatedText(translationHTML, false);
        } else {
            UIUpdater.updateTranslatedText(`(Source as fallback): ${sourceTranscriptSegment}`, true);
        }
    }
}
