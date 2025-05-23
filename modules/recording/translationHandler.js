import { translateWithAI, validateTranslationConfig } from '../translation.js';
import { pasteText } from '../utils.js';
import { recordingState } from './recordingState.js';
import { buildHTMLTranscript, countSentenceEnders } from './paragraphBuilder.js';
import { UIUpdater } from './uiUpdater.js';
import { appState } from '../../stores/appState.js';

export class TranslationHandler {
    static extractCurrentSpeakerId() {
        if (recordingState.finalParagraphs.length > 0) {
            return recordingState.finalParagraphs[recordingState.finalParagraphs.length - 1].speaker;
        }

        const sourceText = document.getElementById('source-text');
        if (sourceText) {
            const speakerMatch = /speaker\s+(\d+)/i.exec(sourceText.innerHTML);
            if (speakerMatch && speakerMatch[1]) {
                return parseInt(speakerMatch[1]);
            }
        }

        return 0;
    }

    static async handleTranslationAndPasting(transcript, isFinal, sourceParagraphs = []) {
        if (!transcript.trim()) {
            console.log('[TranslationHandler] Empty transcript, skipping');
            return;
        }

        if (!isFinal) {
            console.log('[TranslationHandler] Not a final transcript, skipping');
            return;
        }

        const pasteOption = document.getElementById('pasteOption').value;
        const translationEnabled = appState.enableTranslation;

        console.log(`[TranslationHandler] Handling transcript: "${transcript}"`);
        console.log(`[TranslationHandler] Options: pasteOption=${pasteOption}, translationEnabled=${translationEnabled}, typingActive=${recordingState.typingActive}`);

        if (recordingState.typingActive) {
            if (pasteOption === 'source') {
                console.log(`[TranslationHandler] Pasting source text: "${transcript}"`);
                await pasteText(transcript);
            } else if (pasteOption === 'translated' && translationEnabled) {
                await this.handleTypingTranslation(transcript);
            }
        } else {
            if (pasteOption === 'translated' && translationEnabled) {
                await this.handleNonTypingTranslation(transcript);
            }
        }
    }

    static async handleTypingTranslation(transcript) {
        console.log(`[TranslationHandler] Translation requested for: "${transcript}"`);
        
        if (recordingState.isTranslating) {
            console.log('[TranslationHandler] Translation already in progress, skipping');
            return;
        }

        const configValid = await validateTranslationConfig();
        if (!configValid.valid) {
            console.error('[TranslationHandler] Translation config invalid:', configValid.message);
            UIUpdater.updateTranslationStatus(configValid.message, true);
            await pasteText(transcript);
            return;
        }

        try {
            recordingState.isTranslating = true;
            UIUpdater.updateTranslationStatus("Translating...");
            console.log('[TranslationHandler] Starting translation process...');

            const translation = await translateWithAI(
                transcript, 
                recordingState.transcriptions.join(' '), 
                recordingState.translations.join(' ')
            );

            console.log(`[TranslationHandler] Translation result: "${translation}"`);

            if (translation.startsWith("Translation Error:")) {
                console.error(`[TranslationHandler] Translation failed: "${translation}"`);
                UIUpdater.updateTranslationStatus(translation, true);
                await pasteText(transcript);
            } else {
                console.log(`[TranslationHandler] Translation succeeded: "${translation}"`);
                await this.updateTranslationUI(translation);
                recordingState.translations.push(translation);
                if (recordingState.translations.length > 10) recordingState.translations.shift();
                await pasteText(translation);
            }
        } catch (error) {
            console.error('[TranslationHandler] Translation error:', error);
            UIUpdater.updateTranslationStatus(`Translation Error: ${error.message}`, true);
            await pasteText(transcript);
        } finally {
            recordingState.isTranslating = false;
        }
    }

    static async handleNonTypingTranslation(transcript) {
        console.log(`[TranslationHandler] Translating (no typing): "${transcript}"`);
        
        if (recordingState.isTranslating) {
            console.log('[TranslationHandler] Translation already in progress, skipping');
            return;
        }

        const configValid = await validateTranslationConfig();
        if (!configValid.valid) {
            console.error('[TranslationHandler] Translation config invalid:', configValid.message);
            UIUpdater.updateTranslationStatus(configValid.message, true);
            return;
        }

        try {
            recordingState.isTranslating = true;
            UIUpdater.updateTranslationStatus("Translating...");
            console.log('[TranslationHandler] Starting translation process...');

            const translation = await translateWithAI(
                transcript, 
                recordingState.transcriptions.join(' '), 
                recordingState.translations.join(' ')
            );

            console.log(`[TranslationHandler] Translation result: "${translation}"`);

            if (translation.startsWith("Translation Error:")) {
                console.error(`[TranslationHandler] Translation failed: "${translation}"`);
                UIUpdater.updateTranslationStatus(translation, true);
            } else {
                console.log(`[TranslationHandler] Translation succeeded: "${translation}"`);
                await this.updateTranslationUI(translation);
                recordingState.translations.push(translation);
                if (recordingState.translations.length > 10) recordingState.translations.shift();
            }
        } catch (error) {
            console.error('[TranslationHandler] Translation error:', error);
            UIUpdater.updateTranslationStatus(`Translation Error: ${error.message}`, true);
        } finally {
            recordingState.isTranslating = false;
        }
    }

    static async updateTranslationUI(translation) {
        if (appState.diarizationEnabled) {
            const speakerId = this.extractCurrentSpeakerId();
            const translatedParagraph = {
                speaker: speakerId,
                text: translation,
                endTime: 0,
                sentenceCount: countSentenceEnders(translation)
            };

            recordingState.translationParagraphs.push(translatedParagraph);
            const translationHTML = buildHTMLTranscript(recordingState.translationParagraphs, []);
            UIUpdater.updateTranslatedText(translationHTML);
        } else {
            UIUpdater.updateTranslatedText(translation, true);
        }
    }
}
