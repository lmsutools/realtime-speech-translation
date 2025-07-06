import { translateWithAI, validateTranslationConfig } from './translation.js';
import { pasteText } from './utils.js';
import { isInputDeviceAvailable } from './devices.js';
import { appState } from '../stores/appState.js';
import { ipcRenderer } from 'electron';
import { runInAction } from 'mobx';
import { scrollPaneToBottom, isAutoScrollEnabled } from './scrollUtils.js';

// ====================== GLOBALS ======================
let mediaRecorder;
let socket;
let deepgramCaptions = [];       // store all raw Deepgram responses
let transcriptions = [];         // store final transcripts so far (for context)
let translations = [];           // store final translations so far
let finalTranscription = "";     // final plain text when diarization is off
let finalParagraphs = [];        // final paragraphs when diarization is on
let translationParagraphs = [];  // store final translated paragraphs when diarization is on
let currentUtteranceWords = new Map(); // Buffer for the current in-progress utterance
let autoStopTimerId = null;
let typingActive = false;
let preservedContent = "";       // Store content before a restart in its original format
let isTranslating = false;       // Translation in progress flag
let debugEventCounter = 0;       // Counter for debugging events

// For paragraph splitting logic
const TIME_GAP_THRESHOLD = 3.0;
const MAX_SENTENCES_PER_PARAGRAPH = 3;

// Predefined speaker label colors (for up to 10 speakers)
const speakerPillColors = ["#e91e63", "#9c27b0", "#673ab7", "#3f51b5", "#2196f3", "#03a9f4", "#00bcd4", "#009688", "#4caf50", "#8bc34a"];

ipcRenderer.on('typing-app-typing-mode-changed', (event, isActive) => {
    typingActive = isActive;
});

// Dedicated function to log the debug state object
function logDebugState(state) {
    console.log('--- START ScribeFlow Debug State ---');
    console.log(JSON.stringify(state, null, 2));
    console.log('--- END ScribeFlow Debug State ---');
}

function scrollPaneToTop(paneSelector) {
    const paneContent = document.querySelector(paneSelector + ' .pane-content');
    if (paneContent) {
        paneContent.scrollTop = 0;
    }
}

function buildPlainTranscript(finalText, ephemeralWords) {
    const ephemeralText = ephemeralWords.map(w => w.text).join(' ');
    return (finalText + " " + ephemeralText).trim();
}

function convertParagraphsToText(paragraphs) {
    return paragraphs.map(p => p.text.trim()).join(' ');
}

export async function startRecording(isRestart = false) {
    socket = null;
    try {
        const diarizationEnabledFromStore = await ipcRenderer.invoke('store-get', 'diarizationEnabled', false);
        runInAction(() => { appState.setDiarizationEnabled(diarizationEnabledFromStore); });
        const diarizationEnabled = appState.diarizationEnabled;
        console.log('[Recording] diarizationEnabled:', diarizationEnabled);

        const combined = appState.sourceLanguage;
        const [selectedModel, selectedLanguage] = combined.split('|');
        let deepgramKey = appState.deepgramApiKey;
        if (!deepgramKey) {
            deepgramKey = await ipcRenderer.invoke('store-get', 'deepgramApiKey', '');
            if (deepgramKey) runInAction(() => { appState.setDeepgramApiKey(deepgramKey); });
        }
        if (!deepgramKey) {
            console.error('[Recording] No Deepgram API key set');
            document.getElementById('source-text').textContent = 'Please set a Deepgram API key in settings.';
            ipcRenderer.send('typing-app-recording-state-changed', false);
            return;
        }

        if (appState.enableTranslation) {
            const validationResult = await validateTranslationConfig();
            if (!validationResult.valid) {
                document.getElementById('translated-text').innerHTML = `<span class="error-message">${validationResult.message}</span>`;
            }
        }

        const selectedDeviceId = await ipcRenderer.invoke('store-get', 'defaultInputDevice', '');
        let stream;
        if (selectedDeviceId && await isInputDeviceAvailable(selectedDeviceId)) {
            stream = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: selectedDeviceId } });
        } else {
            console.warn('[Recording] Using default input device');
            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            if (!isRestart) document.getElementById('source-text').textContent = 'Using default input device.';
        }

        mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        let queryParams = `?model=${selectedModel}&language=${selectedLanguage}&punctuate=true&interim_results=true`;
        if (diarizationEnabled) {
            queryParams += '&diarize=true';
        }
        
        const wsUrl = `wss://api.deepgram.com/v1/listen${queryParams}`;
        console.log('[Recording] WebSocket URL:', wsUrl);
        socket = new WebSocket(wsUrl, ['token', deepgramKey]);

        socket.onerror = (error) => {
            console.error('[Recording] WebSocket error:', error);
            document.getElementById('source-text').textContent = "Deepgram connection failed.";
            ipcRenderer.send('typing-app-recording-state-changed', false);
        };

        socket.onopen = async () => {
            console.log('[Recording] WebSocket opened');
            runInAction(() => { appState.setIsRecording(true); });

            if (isRestart && preservedContent) {
                document.getElementById('source-text').innerHTML = preservedContent + '<br>';
            } else if (!isRestart) {
                resetRecordingData();
            }

            mediaRecorder.start(250);
            ipcRenderer.send('typing-app-recording-state-changed', true);
            console.log('[Recording] Recording started');

            const autoStopTimer = await ipcRenderer.invoke('store-get', 'autoStopTimer', 60);
            if (autoStopTimer > 0) {
                autoStopTimerId = setTimeout(() => {
                    stopRecording();
                    document.getElementById('source-text').textContent += "\n---TRANSCRIPTION STOPPED, TIME LIMIT REACHED---";
                }, autoStopTimer * 60000);
            }
        };

        socket.onmessage = async (event) => {
            debugEventCounter++;
            const parsed = JSON.parse(event.data || '{}');
            deepgramCaptions.push(parsed);

            const alt = parsed?.channel?.alternatives[0];
            if (!alt) return;
            
            const wordsFromApi = alt.words || [];
            let actionTaken = "NO_ACTION";

            // --- CAPTURE STATE BEFORE ---
            const stateBefore = {
                finalTranscription: finalTranscription,
                finalParagraphsCount: finalParagraphs.length,
                currentUtteranceWords: [...currentUtteranceWords.values()].map(w => w.text).join(' '),
            };

            // --- PROCESSING LOGIC ---
            if (parsed.is_final) {
                actionTaken = "COMMITTED_TO_HISTORY";
                // Convert the final words from the API into our standardized objects
                const finalWords = normalizeApiWords(wordsFromApi);

                if (finalWords.length > 0) {
                    let segmentText;
                    if (appState.diarizationEnabled) {
                        const newFinalParagraphs = buildParagraphsFromWords(finalWords);
                        finalParagraphs.push(...newFinalParagraphs);
                        segmentText = convertParagraphsToText(newFinalParagraphs);
                    } else {
                        segmentText = finalWords.map(w => w.text).join(' ').trim();
                        finalTranscription = (finalTranscription + " " + segmentText).trim();
                    }
                    
                    transcriptions.push(segmentText);
                    if (transcriptions.length > 10) transcriptions.shift();
                    
                    await handleTranslationAndPasting(segmentText, true);
                }
                
                // Clear the temporary buffer as this utterance is now part of the history.
                currentUtteranceWords.clear();

            } else {
                // It's an interim result. Replace the buffer with the latest state.
                if (wordsFromApi.length > 0) {
                    actionTaken = "REPLACED_UTTERANCE_BUFFER";
                    syncCurrentUtterance(wordsFromApi);
                }
            }

            // --- CAPTURE STATE AFTER ---
            const stateAfter = {
                finalTranscription: finalTranscription,
                finalParagraphsCount: finalParagraphs.length,
                currentUtteranceWords: [...currentUtteranceWords.values()].map(w => w.text).join(' '),
            };

            // --- LOG DEBUG OBJECT ---
            logDebugState({
                eventNumber: debugEventCounter,
                timestamp: new Date().toISOString(),
                incomingMessage: parsed,
                stateBeforeProcessing: stateBefore,
                actionTaken: actionTaken,
                stateAfterProcessing: stateAfter
            });

            // Always render the UI with the latest state.
            renderTranscription();
        };

        socket.onclose = () => {
            console.log('[Recording] WebSocket connection closed');
        };

        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0 && socket?.readyState === WebSocket.OPEN) {
                socket.send(e.data);
            }
        };

        document.getElementById('start').style.display = 'none';
        document.getElementById('stop').style.display = 'block';

    } catch (error) {
        console.error('[Recording] Error starting recording:', error);
        document.getElementById('source-text').textContent = 'Recording failed: ' + error.message;
        ipcRenderer.send('typing-app-recording-state-changed', false);
        document.getElementById('start').style.display = 'block';
        document.getElementById('stop').style.display = 'none';
    }
}

export function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
        console.log('[Recording] Recording stopped');
    }
    if (socket) {
        socket.close();
        socket = null;
    }
    runInAction(() => { appState.setIsRecording(false); });
    ipcRenderer.send('typing-app-recording-state-changed', false);

    if (autoStopTimerId) {
        clearTimeout(autoStopTimerId);
        autoStopTimerId = null;
    }

    document.getElementById('start').style.display = 'block';
    document.getElementById('stop').style.display = 'none';
}

export function onResetClicked() {
    resetRecordingData();
    renderTranscription(); // Render the empty state
}

function renderTranscription() {
    let newContent = "";
    let plainTextForIPC = "";
    const ephemeralWords = [...currentUtteranceWords.values()].sort((a,b) => a.start - b.start);

    if (appState.diarizationEnabled) {
        const ephemeralParagraphs = buildParagraphsFromWords(ephemeralWords);
        newContent = buildHTMLTranscript(finalParagraphs, ephemeralParagraphs);
        plainTextForIPC = buildPlainTranscriptDiarized(finalParagraphs, ephemeralParagraphs);
    } else {
        const fullText = buildPlainTranscript(finalTranscription, ephemeralWords);
        newContent = fullText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        plainTextForIPC = fullText;
    }

    document.getElementById('source-text').innerHTML = (preservedContent ? preservedContent + '<br>' : '') + newContent;

    if (window.sourceAutoScrollEnabled) {
        scrollPaneToBottom('.source-pane');
    }

    ipcRenderer.send('typing-app-transcript-updated', plainTextForIPC);
}

function buildPlainTranscriptDiarized(finalParas, ephemeralParas) {
    const combined = [...finalParas, ...ephemeralParas];
    return combined.map(para => para.text.trim()).join(' ');
}

export function resetRecordingData() {
    transcriptions = [];
    translations = [];
    deepgramCaptions = [];
    finalTranscription = "";
    finalParagraphs = [];
    translationParagraphs = [];
    currentUtteranceWords.clear();
    preservedContent = "";
    debugEventCounter = 0;
    document.getElementById('source-text').textContent = "";
    document.getElementById('translated-text').textContent = "";
    scrollPaneToTop('.source-pane');
    scrollPaneToTop('.translated-pane');
    console.log('[Recording] Full recording data reset');
}

// Converts raw API words into our standard format
function normalizeApiWords(apiWords) {
    return apiWords.map(word => ({
        start: word.start,
        end: word.end,
        speaker: word.speaker,
        text: word.word, // **THE FIX IS HERE: .word -> .text**
        confidence: word.confidence,
        language: word.language
    }));
}

function syncCurrentUtterance(wordsFromApi) {
    currentUtteranceWords.clear();
    const normalizedWords = normalizeApiWords(wordsFromApi);
    normalizedWords.forEach(word => {
        const key = makeWordKey(word.start, word.end);
        currentUtteranceWords.set(key, word);
    });
}

function makeWordKey(start, end) {
    return `${start.toFixed(3)}-${end.toFixed(3)}`;
}

function buildParagraphsFromWords(words) {
    if (!words.length) return [];
    words.sort((a, b) => a.start - b.start);
    let paragraphs = [];
    let currentPara = null;
    for (const w of words) {
        if (!currentPara) {
            currentPara = createParagraph(w);
            continue;
        }
        const gap = w.start - currentPara.endTime;
        const sameSpeaker = (w.speaker === currentPara.speaker);
        const newSentCount = currentPara.sentenceCount + countSentenceEnders(w.text);

        if (gap >= TIME_GAP_THRESHOLD || !sameSpeaker || newSentCount >= MAX_SENTENCES_PER_PARAGRAPH) {
            paragraphs.push(currentPara);
            currentPara = createParagraph(w);
        } else {
            currentPara.text += " " + w.text;
            currentPara.endTime = w.end;
            currentPara.sentenceCount = newSentCount;
        }
    }
    if (currentPara) {
        paragraphs.push(currentPara);
    }
    return paragraphs;
}

function createParagraph(w) {
    return {
        speaker: w.speaker,
        text: w.text, // Now receives a normalized object
        endTime: w.end,
        sentenceCount: countSentenceEnders(w.text)
    };
}

// This function now receives a defined string.
function countSentenceEnders(text) {
    if (typeof text !== 'string') {
        return 0; // Failsafe
    }
    const matches = text.match(/[.!?]+/g);
    return matches ? matches.length : 0;
}

function buildHTMLTranscript(finalParas, ephemeralParas) {
    const combined = [...finalParas, ...ephemeralParas];
    if (!combined.length) return "";
    let htmlParts = [];
    let lastSpeaker = null;
    for (const para of combined) {
        const spk = para.speaker;
        const txt = para.text.trim();
        if (!txt) continue;

        if (spk !== lastSpeaker) {
            const color = getSpeakerColor(spk);
            const pill = `<span style="background-color: ${color};color: #fff;border-radius: 10px;padding: 2px 6px;margin-right: 6px;font-weight: 500;">speaker ${spk}</span>`;
            htmlParts.push(`<div>${pill}${txt}</div>`);
            lastSpeaker = spk;
        } else {
            htmlParts.push(`<div>${txt}</div>`);
        }
    }
    return htmlParts.join("");
}

function getSpeakerColor(speakerId) {
    return speakerPillColors[speakerId % speakerPillColors.length];
}

export function preserveCurrentContent() {
    renderTranscription(); 
    preservedContent = document.getElementById('source-text').innerHTML;
    
    finalParagraphs = [];
    finalTranscription = "";
    currentUtteranceWords.clear();
}

function updateTranslationStatus(message, isError = false) {
    const translatedText = document.getElementById('translated-text');
    if (!translatedText) return;
    if (isError) {
        translatedText.innerHTML += `<span class="error-message">${message}</span><br>`;
    } else {
        const statusElem = document.createElement('div');
        statusElem.className = 'translation-status';
        statusElem.textContent = message;
        translatedText.appendChild(statusElem);
        setTimeout(() => {
            if (statusElem.parentNode === translatedText) {
                translatedText.removeChild(statusElem);
            }
        }, 3000);
    }
}

function extractCurrentSpeakerId() {
    if (finalParagraphs.length > 0) {
        return finalParagraphs[finalParagraphs.length - 1].speaker;
    }
    const sourceText = document.getElementById('source-text');
    if (sourceText) {
        const speakerPills = sourceText.querySelectorAll('span[style*="background-color"]');
        if (speakerPills.length > 0) {
            const lastPill = speakerPills[speakerPills.length - 1];
            const speakerMatch = /speaker\s+(\d+)/i.exec(lastPill.textContent);
            if (speakerMatch && speakerMatch[1]) {
                return parseInt(speakerMatch[1]);
            }
        }
    }
    return 0;
}

async function handleTranslationAndPasting(transcript, isFinal) {
    if (!transcript.trim() || !isFinal) {
        return;
    }
    const pasteOption = document.getElementById('pasteOption').value;
    const translationEnabled = appState.enableTranslation;

    console.log(`[Recording] Handling transcript: "${transcript}"`);
    console.log(`[Recording] Options: pasteOption=${pasteOption}, translationEnabled=${translationEnabled}, typingActive=${typingActive}`);

    if (typingActive) {
        if (pasteOption === 'source') {
            await pasteText(transcript);
        } else if (pasteOption === 'translated' && translationEnabled) {
            if (isTranslating) return;

            const configValid = await validateTranslationConfig();
            if (!configValid.valid) {
                updateTranslationStatus(configValid.message, true);
                await pasteText(transcript);
                return;
            }
            try {
                isTranslating = true;
                updateTranslationStatus("Translating...");
                const translation = await translateWithAI(transcript, transcriptions.join(' '), translations.join(' '));
                if (translation.startsWith("Translation Error:")) {
                    updateTranslationStatus(translation, true);
                    await pasteText(transcript);
                } else {
                    translations.push(translation);
                    if (translations.length > 10) translations.shift();
                    await pasteText(translation);
                }
            } catch (error) {
                updateTranslationStatus(`Translation Error: ${error.message}`, true);
                await pasteText(transcript);
            } finally {
                isTranslating = false;
            }
        }
    } else {
        if (translationEnabled) {
            if (isTranslating) return;

            const configValid = await validateTranslationConfig();
            if (!configValid.valid) {
                updateTranslationStatus(configValid.message, true);
                return;
            }
            try {
                isTranslating = true;
                updateTranslationStatus("Translating...");
                const translation = await translateWithAI(transcript, transcriptions.join(' '), translations.join(' '));

                if (translation.startsWith("Translation Error:")) {
                    updateTranslationStatus(translation, true);
                } else {
                    if (appState.diarizationEnabled) {
                        const speakerId = extractCurrentSpeakerId();
                        const translatedParagraph = { speaker: speakerId, text: translation, endTime: 0, sentenceCount: countSentenceEnders(translation) };
                        translationParagraphs.push(translatedParagraph);
                        const translationHTML = buildHTMLTranscript(translationParagraphs, []);
                        document.getElementById('translated-text').innerHTML = translationHTML;
                    } else {
                        document.getElementById('translated-text').textContent += " " + translation;
                    }
                    if (window.translatedAutoScrollEnabled) {
                        scrollPaneToBottom('.translated-pane');
                    }
                    translations.push(translation);
                    if (translations.length > 10) translations.shift();
                }
            } catch (error) {
                updateTranslationStatus(`Translation Error: ${error.message}`, true);
            } finally {
                isTranslating = false;
            }
        }
    }
}

// Export the translation function to window for direct access
window.translateWithAI = translateWithAI;
