import { translateWithAI } from './translation.js';
import { pasteText } from './utils.js';
import { isInputDeviceAvailable } from './devices.js';
import { appState } from '../stores/appState.js';
import { ipcRenderer } from 'electron';
import { runInAction } from 'mobx';

// ====================== GLOBALS ======================
let mediaRecorder;
let socket;
let deepgramCaptions = [];       // store all raw Deepgram responses
let transcriptions = [];         // store final transcripts so far (for context)
let translations = [];           // store final translations so far
let finalTranscription = "";
// finalParagraphs: array of { speaker, text, endTime, sentenceCount }
let finalParagraphs = [];
// ephemeralWords: Map keyed by "start-end" => { start, end, speaker, text, confidence, language }
let ephemeralWords = new Map();
let autoStopTimerId = null;
let typingActive = false;

// For paragraph splitting logic
const TIME_GAP_THRESHOLD = 3.0;           // seconds
const MAX_SENTENCES_PER_PARAGRAPH = 3;

// Predefined speaker label colors (for up to 10 speakers)
const speakerPillColors = [
    "#e91e63", // pink
    "#9c27b0", // purple
    "#673ab7", // deep purple
    "#3f51b5", // indigo
    "#2196f3", // blue
    "#03a9f4", // light blue
    "#00bcd4", // cyan
    "#009688", // teal
    "#4caf50", // green
    "#8bc34a"  // light green
];

ipcRenderer.on('typing-app-typing-mode-changed', (event, isActive) => { typingActive = isActive; });

/*** Build plain text transcript from final and ephemeral paragraphs, excluding speaker labels.*/
function buildPlainTranscript(finalParas, ephemeralParas) {
    const combined = [...finalParas, ...ephemeralParas];
    return combined.map(para => para.text.trim()).join(' ');
}

/*** Called by the "Start" button. Opens the mic, sets up WebSocket to Deepgram,
 * and begins streaming audio data. If diarization is enabled, we do ephemeral
 * dictionary approach with color-coded labels; else, fallback to old approach.
 */
export async function startRecording() {
    socket = null;
    try {
        // Force-read diarization from store
        const diarizationEnabledFromStore = await ipcRenderer.invoke('store-get', 'diarizationEnabled', false);
        runInAction(() => { appState.setDiarizationEnabled(diarizationEnabledFromStore); });
        const diarizationEnabled = appState.diarizationEnabled;
        console.log('[Recording] diarizationEnabled:', diarizationEnabled);
        const combined = appState.sourceLanguage;
        const [selectedModel, selectedLanguage] = combined.split('|');
        let deepgramKey = appState.deepgramApiKey;
        if (!deepgramKey) {
            deepgramKey = await ipcRenderer.invoke('store-get', 'deepgramApiKey', '');
            if (deepgramKey) {
                runInAction(() => { appState.setDeepgramApiKey(deepgramKey); });
            }
        }
        if (!deepgramKey) {
            console.error('[Recording] No Deepgram API key set');
            document.getElementById('source-text').textContent = 'Please set a Deepgram API key in settings.';
            ipcRenderer.send('typing-app-recording-state-changed', false);
            return;
        }
        // Acquire audio from user’s microphone
        const selectedDeviceId = await ipcRenderer.invoke('store-get', 'defaultInputDevice', '');
        let stream;
        if (selectedDeviceId && await isInputDeviceAvailable(selectedDeviceId)) {
            stream = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: selectedDeviceId } });
        } else {
            console.warn('[Recording] Using default input device');
            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            document.getElementById('source-text').textContent = 'Using default input device.';
        }
        mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        // Build Deepgram WebSocket URL
        let queryParams = `?model=${selectedModel}&language=${selectedLanguage}&punctuate=true&interim_results=true`;
        if (diarizationEnabled) { queryParams += '&diarize=true'; }
        const wsUrl = `wss://api.deepgram.com/v1/listen${queryParams}`;
        console.log('[Recording] WebSocket URL:', wsUrl);
        socket = new WebSocket(wsUrl, ['token', deepgramKey]);
        socket.onerror = (error) => {
            console.error('[Recording] WebSocket error:', error);
            document.getElementById('source-text').textContent = "Deepgram connection failed.";
            ipcRenderer.send('typing-app-recording-state-changed', false);
        };
        // On open, start capturing
        socket.onopen = async () => {
            console.log('[Recording] WebSocket opened');
            document.getElementById('source-text').textContent = '';
            mediaRecorder.start(50);
            ipcRenderer.send('typing-app-recording-state-changed', true);
            console.log('[Recording] Recording started');
            const autoStopTimer = await ipcRenderer.invoke('store-get', 'autoStopTimer', 60);
            autoStopTimerId = setTimeout(() => {
                stopRecording();
                document.getElementById('source-text').textContent += "\n---TRANSCRIPTION STOPPED, TIME LIMIT REACHED---";
            }, autoStopTimer * 60000);
        };
        // On each message from Deepgram
        socket.onmessage = async (event) => {
            const parsed = JSON.parse(event.data || '{}');
            deepgramCaptions.push(parsed);
            // If diarization is off, fallback approach:
            if (!appState.diarizationEnabled) {
                handleNoDiarization(parsed);
                return;
            }
            const alt = parsed?.channel?.alternatives[0];
            if (!alt) return;
            const words = alt.words || [];
            const plainTranscript = alt.transcript || "";
            // 1) Sync ephemeralWords with this partial chunk
            syncEphemeralWords(ephemeralWords, words);
            // 2) If partial => build ephemeral paragraphs + final => display
            if (!parsed.is_final) {
                const ephemeralParagraphs = buildParagraphsFromWords([...ephemeralWords.values()]);
                const html = buildHTMLTranscript(finalParagraphs, ephemeralParagraphs);
                document.getElementById('source-text').innerHTML = html;
                const plainText = buildPlainTranscript(finalParagraphs, ephemeralParagraphs);
                ipcRenderer.send('typing-app-transcript-updated', plainText);
            }
            // 3) If final => move ephemeral paragraphs => final, clear ephemeral
            else {
                const ephemeralParagraphs = buildParagraphsFromWords([...ephemeralWords.values()]);
                finalParagraphs.push(...ephemeralParagraphs);
                ephemeralWords.clear(); // done with ephemeral
                finalTranscription = buildHTMLTranscript(finalParagraphs, []);
                document.getElementById('source-text').innerHTML = finalTranscription;
                const plainText = buildPlainTranscript(finalParagraphs, []);
                ipcRenderer.send('typing-app-transcript-updated', plainText);
                // For context & translation
                transcriptions.push(plainTranscript);
                if (transcriptions.length > 10) transcriptions.shift();
                await handleTranslationAndPasting(plainTranscript, true);
                // Log all responses so far
                console.log('[Recording] All Deepgram Responses:', deepgramCaptions);
            }
        };
        // On close
        socket.onclose = () => { console.log('[Recording] WebSocket connection closed'); };
        // MediaRecorder -> send data to socket
        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0 && socket?.readyState === WebSocket.OPEN) {
                socket.send(e.data);
            }
        };
        // Adjust UI
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

/*** Stop the recording and close the socket*/
export function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
        console.log('[Recording] Recording stopped');
    }
    if (socket) {
        socket.close();
        socket = null;
    }
    ipcRenderer.send('typing-app-recording-state-changed', false);
    if (autoStopTimerId) {
        clearTimeout(autoStopTimerId);
        autoStopTimerId = null;
    }
    document.getElementById('start').style.display = 'block';
    document.getElementById('stop').style.display = 'none';
}

/*** Called by the "Reset" button in your UI.
 * If recording is active, do a "partial reset" so transcription continues.
 * If not recording, do a "full reset."
 */
export function onResetClicked() {
    // Check if we are currently recording
    const isRecordingActive = !!(mediaRecorder && mediaRecorder.state !== 'inactive' && socket);
    if (isRecordingActive) {
        // PARTIAL RESET
        finalParagraphs = [];
        ephemeralWords.clear();
        finalTranscription = "";
        deepgramCaptions = [];
        transcriptions = [];
        translations = [];
        document.getElementById('source-text').textContent = "";
        document.getElementById('translated-text').textContent = "";
        console.log('[Recording] Partial reset done. Recording continues...');
    } else {
        // FULL RESET
        resetRecordingData();
    }
}

/*** If diarization is disabled, fallback approach*/
function handleNoDiarization(parsed) {
    const alt = parsed?.channel?.alternatives[0];
    if (!alt) return;
    const transcript = alt.transcript || "";
    if (!transcript.trim()) return;
    if (parsed.is_final) {
        finalTranscription += " " + transcript;
        document.getElementById('source-text').textContent = finalTranscription;
        transcriptions.push(transcript);
        if (transcriptions.length > 10) { transcriptions.shift(); }
        handleTranslationAndPasting(transcript, true);
    } else {
        document.getElementById('source-text').textContent = finalTranscription + " " + transcript;
    }
}

/*** The "full" reset for everything. This is used if not currently recording.
 * It clears all transcript data, but DOES NOT kill the mediaRecorder or socket
 * (because we might be disconnected already).
 */
export function resetRecordingData() {
    transcriptions = [];
    translations = [];
    deepgramCaptions = [];
    finalTranscription = "";
    finalParagraphs = [];
    ephemeralWords.clear();
    document.getElementById('source-text').textContent = "";
    document.getElementById('translated-text').textContent = "";
    console.log('[Recording] Full recording data reset');
}

/*** Compare ephemeralWords with the new chunk of words from Deepgram,
 * updating or removing items as needed so we reflect the latest partial updates.
 */
function syncEphemeralWords(ephemeralMap, words) {
    // 1) Build new partial map
    const newMap = new Map();
    for (const w of words) {
        const key = makeWordKey(w.start, w.end);
        newMap.set(key, {
            start: w.start,
            end: w.end,
            speaker: w.speaker,
            text: w.word,  // or w.punctuated_word
            confidence: w.confidence,
            language: w.language
        });
    }
    // 2) Remove ephemeral words not in new partial
    for (const oldKey of ephemeralMap.keys()) {
        if (!newMap.has(oldKey)) {
            ephemeralMap.delete(oldKey);
        }
    }
    // 3) Add or update ephemeral words
    for (const [key, val] of newMap) {
        if (!ephemeralMap.has(key)) {
            ephemeralMap.set(key, val);
        } else {
            const existing = ephemeralMap.get(key);
            if (existing.speaker !== val.speaker || existing.text !== val.text) {
                ephemeralMap.set(key, val);
            }
        }
    }
}

/*** Make a unique key for each ephemeral word, e.g. "3.44-4.08"*/
function makeWordKey(start, end) {
    return `${start.toFixed(2)}-${end.toFixed(2)}`;
}

/*** Convert ephemeral or final word objects into paragraphs, splitting if:
 *  - time gap >= 3s
 *  - speaker changes
 *  - paragraph has >= 3 sentence enders
 */
function buildParagraphsFromWords(words) {
    if (!words.length) return [];
    // Sort by start time
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

/*** Create a new paragraph from a single word*/
function createParagraph(w) {
    return {
        speaker: w.speaker,
        text: w.text,
        endTime: w.end,
        sentenceCount: countSentenceEnders(w.text)
    };
}

/*** Build an HTML-based transcript from final + ephemeral paragraphs,
 * color-coding speaker labels, skipping repeated labels if the same speaker
 * continues in the next paragraph.
 */
function buildHTMLTranscript(finalParas, ephemeralParas) {
    const combined = [...finalParas, ...ephemeralParas];
    if (!combined.length) return "";
    let htmlParts = [];
    let lastSpeaker = null;
    for (const para of combined) {
        const spk = para.speaker;
        const txt = para.text.trim();
        if (spk !== lastSpeaker) {
            // label + color pill
            const color = getSpeakerColor(spk);
            const pill = `<span style="background-color: ${color};color: #fff;border-radius: 10px;padding: 2px 6px;margin-right: 6px;font-weight: 500;">speaker ${spk}</span>`;
            htmlParts.push(`<div>${pill} ${txt}</div>`);
            lastSpeaker = spk;
        } else {
            // same speaker => no label
            htmlParts.push(`<div>${txt}</div>`);
        }
    }
    return htmlParts.join("");
}

/*** Return color for given speaker ID (0..n). We cycle through up to 10 colors.*/
function getSpeakerColor(speakerId) {
    return speakerPillColors[speakerId % speakerPillColors.length];
}

/*** Count sentence enders in text. Basic approach: . ? !*/
function countSentenceEnders(text) {
    const matches = text.match(/[.!?]+/g);
    return matches ? matches.length : 0;
}

/*** If final transcript, handle translation/pasting if user wants it.*/
async function handleTranslationAndPasting(transcript, isFinal) {
    if (!transcript.trim()) return;
    if (!isFinal) return;
    const pasteOption = document.getElementById('pasteOption').value;
    const translationEnabled = appState.enableTranslation;
    if (typingActive) {
        if (pasteOption === 'source') {
            pasteText(transcript);
        } else if (pasteOption === 'translated' && translationEnabled) {
            const translation = await translateWithAI(transcript, transcriptions.join(' '), translations.join(' '));
            translations.push(translation);
            if (translations.length > 10) translations.shift();
            document.getElementById('translated-text').textContent += " " + translation;
            pasteText(translation);
        }
    } else {
        if (pasteOption === 'translated' && translationEnabled) {
            const translation = await translateWithAI(transcript, transcriptions.join(' '), translations.join(' '));
            translations.push(translation);
            if (translations.length > 10) translations.shift();
            document.getElementById('translated-text').textContent += " " + translation;
        }
    }
}
