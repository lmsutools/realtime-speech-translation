import { recordingState } from './recordingState.js';
import { syncEphemeralWords, buildParagraphsFromWords, buildHTMLTranscript, buildPlainTranscript } from './paragraphBuilder.js';
import { UIUpdater } from './uiUpdater.js';
import { TranslationHandler } from './translationHandler.js';
import { appState } from '../../stores/appState.js';
import { IPCHandler } from './ipcHandler.js';

export class TranscriptProcessor {
    static async processMessage(parsed) {
        const alt = parsed?.channel?.alternatives[0];
        if (!alt) return;
        
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
            
            const plainText = buildPlainTranscript(recordingState.finalParagraphs, ephemeralParagraphs);
            IPCHandler.sendTranscriptUpdated(plainText);
        } else {
            const ephemeralParagraphs = buildParagraphsFromWords([...recordingState.ephemeralWords.values()]);
            recordingState.finalParagraphs.push(...ephemeralParagraphs);
            recordingState.ephemeralWords.clear();
            
            const newContent = buildHTMLTranscript(recordingState.finalParagraphs, []);
            UIUpdater.updateSourceText(newContent, recordingState.preservedContent);
            
            const plainText = buildPlainTranscript(recordingState.finalParagraphs, []);
            IPCHandler.sendTranscriptUpdated(plainText);
            
            recordingState.transcriptions.push(plainTranscript);
            if (recordingState.transcriptions.length > 10) recordingState.transcriptions.shift();
            
            await TranslationHandler.handleTranslationAndPasting(plainTranscript, true, ephemeralParagraphs);
            
            console.log('[TranscriptProcessor] All Deepgram Responses:', recordingState.deepgramCaptions);
        }
    }
    
    static async processNonDiarizedTranscript(parsed, plainTranscript) {
        const alt = parsed?.channel?.alternatives[0];
        if (!alt) return;
        
        const transcript = alt.transcript || "";
        if (!transcript.trim()) return;
        
        if (parsed.is_final) {
            recordingState.finalTranscription += " " + transcript;
            const newContent = recordingState.finalTranscription
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');
            
            UIUpdater.updateSourceText(newContent, recordingState.preservedContent);
            
            recordingState.transcriptions.push(transcript);
            if (recordingState.transcriptions.length > 10) recordingState.transcriptions.shift();
            
            await TranslationHandler.handleTranslationAndPasting(transcript, true);
            IPCHandler.sendTranscriptUpdated(recordingState.finalTranscription);
        } else {
            const interimText = recordingState.finalTranscription + " " + transcript;
            const newContent = interimText
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');
            
            UIUpdater.updateSourceText(newContent, recordingState.preservedContent);
            IPCHandler.sendTranscriptUpdated(interimText);
        }
    }
}
