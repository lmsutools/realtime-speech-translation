import { recordingState } from './recordingState.js';
import { syncEphemeralWords, buildParagraphsFromWords, buildHTMLTranscript, buildPlainTranscript } from './paragraphBuilder.js';
import { UIUpdater } from './uiUpdater.js';
import { TranslationHandler } from './translationHandler.js'; // Make sure this path is correct
import { appState } from '../../stores/appState.js';
import { IPCHandler } from './ipcHandler.js';

export class TranscriptProcessor {
    static async processMessage(parsed) {
        const alt = parsed?.channel?.alternatives[0];
        if (!alt) return;

        recordingState.deepgramCaptions.push(parsed); // Store raw response

        const words = alt.words || [];
        const plainTranscript = alt.transcript || "";

        if (appState.diarizationEnabled) {
            await this.processDiarizedTranscript(parsed, words, plainTranscript);
        } else {
            await this.processNonDiarizedTranscript(parsed, plainTranscript);
        }
    }

    static async processDiarizedTranscript(parsed, words, plainTranscript) {
        syncEphemeralWords(recordingState.ephemeralWords, words);

        if (!parsed.is_final) {
            const ephemeralParagraphs = buildParagraphsFromWords([...recordingState.ephemeralWords.values()]);
            const newContent = buildHTMLTranscript(recordingState.finalParagraphs, ephemeralParagraphs);
            UIUpdater.updateSourceText(newContent, recordingState.preservedContent);
            
            const plainTextForTypingApp = buildPlainTranscript(recordingState.finalParagraphs, ephemeralParagraphs);
            IPCHandler.sendTranscriptUpdated(plainTextForTypingApp);
        } else {
            const ephemeralParagraphs = buildParagraphsFromWords([...recordingState.ephemeralWords.values()]);
            recordingState.finalParagraphs.push(...ephemeralParagraphs);
            recordingState.ephemeralWords.clear();

            const finalHtmlContent = buildHTMLTranscript(recordingState.finalParagraphs, []);
            UIUpdater.updateSourceText(finalHtmlContent, recordingState.preservedContent);
            
            const finalTextForTypingApp = buildPlainTranscript(recordingState.finalParagraphs, []);
            IPCHandler.sendTranscriptUpdated(finalTextForTypingApp);
            
            // This is the plain text of the current final segment for translation/pasting
            const currentFinalSegmentText = convertParagraphsToText(ephemeralParagraphs); 
            await TranslationHandler.handleFinalTranscriptSegment(currentFinalSegmentText);
            
            console.log('[TranscriptProcessor] All Deepgram Responses:', recordingState.deepgramCaptions);
        }
    }

    static async processNonDiarizedTranscript(parsed, plainTranscript) {
        if (!plainTranscript.trim() && !parsed.is_final) return; // Allow empty final to finalize previous

        if (parsed.is_final) {
            // The 'plainTranscript' here is the final segment from Deepgram for this message
            const currentFinalSegmentText = plainTranscript.trim();
            recordingState.finalTranscription += (recordingState.finalTranscription ? " " : "") + currentFinalSegmentText;
            
            const newContent = recordingState.finalTranscription.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            UIUpdater.updateSourceText(newContent, recordingState.preservedContent);
            
            IPCHandler.sendTranscriptUpdated(recordingState.finalTranscription); // Send the whole thing to typing app

            if (currentFinalSegmentText) { // Only process if there's actual text in this segment
                 await TranslationHandler.handleFinalTranscriptSegment(currentFinalSegmentText);
            }
        } else {
            // Interim transcript for non-diarized
            const interimText = recordingState.finalTranscription + (recordingState.finalTranscription ? " " : "") + plainTranscript;
            const newContent = interimText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            UIUpdater.updateSourceText(newContent, recordingState.preservedContent);
            IPCHandler.sendTranscriptUpdated(interimText); // Send interim to typing app
        }
    }
}

// Helper function that might be in paragraphBuilder.js or here
function convertParagraphsToText(paragraphs) {
    return paragraphs.map(p => p.text.trim()).join(' ');
}
