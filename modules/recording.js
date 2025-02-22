/**
 * @fileoverview
 * Advanced ephemeral dictionary approach to handle partial re-labeling from Deepgram.
 * We keep an ephemeralWords Map keyed by (start, end), so if partial reassigns a word's
 * speaker or removes the word, we update or delete accordingly.
 *
 * At final results, ephemeralWords get moved to final paragraphs. This ensures:
 *  - Updated speaker labels reflect the latest partial changes.
 *  - No stale words remain in ephemeral once Deepgram removes or corrects them.
 */

import { translateWithAI } from './translation.js';
import { pasteText } from './utils.js';
import { isInputDeviceAvailable } from './devices.js';
import { appState } from '../stores/appState.js';
import { ipcRenderer } from 'electron';
import { runInAction } from 'mobx';

// ======= GLOBALS =======
let mediaRecorder;
let socket;

// Keep track of all final text in paragraph form
let finalParagraphs = [];
// ephemeralWords: A dictionary (Map) of in-progress words from partial updates
//   keyed by "start-end", each value = { start, end, speaker, text, confidence, language }
let ephemeralWords = new Map();

let deepgramCaptions = []; // store all Deepgram responses
let transcriptions = [];
let translations = [];
let finalTranscription = "";

// For paragraph splitting logic
const TIME_GAP_THRESHOLD = 3.0;   // seconds
const MAX_SENTENCES_PER_PARAGRAPH = 3;

let autoStopTimerId = null;
let typingActive = false;

ipcRenderer.on('typing-app-typing-mode-changed', (event, isActive) => {
  typingActive = isActive;
});

/**
 * Begins recording and sets up the Deepgram WebSocket.
 */
export async function startRecording() {
  socket = null;
  try {
    const diarizationEnabledFromStore = await ipcRenderer.invoke('store-get', 'diarizationEnabled', false);
    runInAction(() => {
      appState.setDiarizationEnabled(diarizationEnabledFromStore);
    });

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

    // Acquire audio
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

    // Build WebSocket URL
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

    // On each WebSocket message from Deepgram
    socket.onmessage = async (msg) => {
      const parsed = JSON.parse(msg.data || '{}');
      deepgramCaptions.push(parsed);

      if (!appState.diarizationEnabled) {
        handleNoDiarization(parsed);
        return;
      }

      const alt = parsed?.channel?.alternatives[0];
      if (!alt) return;

      const words = alt.words || [];
      const plainTranscript = alt.transcript || "";

      // 1) Synchronize ephemeralWords with the new partial chunk
      syncEphemeralWords(ephemeralWords, words);

      // 2) If partial => build ephemeral paragraphs + final paragraphs => display
      //    If final => move ephemeral words to final paragraphs, then display
      if (!parsed.is_final) {
        const ephemeralParagraphs = buildParagraphsFromWords([...ephemeralWords.values()]);
        const displayText = buildDisplayTranscript(finalParagraphs, ephemeralParagraphs);
        document.getElementById('source-text').textContent = displayText;
      } else {
        // final => convert ephemeralWords into final paragraphs
        const ephemeralParagraphs = buildParagraphsFromWords([...ephemeralWords.values()]);
        finalParagraphs.push(...ephemeralParagraphs);
        ephemeralWords.clear(); // done with ephemeral
        // Rebuild finalTranscription
        finalTranscription = buildDisplayTranscript(finalParagraphs, []);
        document.getElementById('source-text').textContent = finalTranscription;

        transcriptions.push(plainTranscript);
        if (transcriptions.length > 10) transcriptions.shift();
        await handleTranslationAndPasting(plainTranscript, true);

        // OPTIONAL: log all responses so far
        console.log('[Recording] All Deepgram Responses:', deepgramCaptions);
      }
    };

    socket.onclose = () => {
      console.log('[Recording] WebSocket connection closed');
    };

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0 && socket?.readyState === WebSocket.OPEN) {
        socket.send(event.data);
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

/**
 * Stops recording and closes the Deepgram WebSocket.
 */
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

/**
 * Resets all data in preparation for a new recording session.
 */
export function resetRecordingData() {
  mediaRecorder = null;
  socket = null;
  transcriptions = [];
  translations = [];
  deepgramCaptions = [];
  finalTranscription = "";
  finalParagraphs = [];
  ephemeralWords.clear();
  console.log('[Recording] Recording data reset');
}

/**
 * Fallback approach if diarization is disabled.
 * @param {object} parsed - Deepgram response JSON
 */
function handleNoDiarization(parsed) {
  const alt = parsed?.channel?.alternatives[0];
  if (!alt) return;
  const transcript = alt.transcript || "";
  if (!transcript) return;

  if (parsed.is_final) {
    finalTranscription += " " + transcript;
    document.getElementById('source-text').textContent = finalTranscription;
    transcriptions.push(transcript);
    if (transcriptions.length > 10) {
      transcriptions.shift();
    }
    handleTranslationAndPasting(transcript, true);
  } else {
    document.getElementById('source-text').textContent = finalTranscription + " " + transcript;
  }
}

/**
 * Synchronizes ephemeralWords with the latest partial update from Deepgram.
 * - We compute a newPartialMap from the current chunk's words.
 * - If ephemeralWords contains a word that is NOT in newPartialMap, remove it (Deepgram removed it).
 * - If ephemeralWords is missing a word from newPartialMap, add it.
 * - If ephemeralWords has the same word but speaker changed, update it.
 *
 * @param {Map<string,object>} ephemeralWords - The global ephemeral dictionary
 * @param {Array<object>} words - The current chunk's word list from Deepgram
 */
function syncEphemeralWords(ephemeralWords, words) {
  // Build newPartialMap: key => {start, end, speaker, text, ...}
  const newPartialMap = new Map();
  for (const w of words) {
    const key = makeWordKey(w.start, w.end);
    newPartialMap.set(key, {
      start: w.start,
      end: w.end,
      speaker: w.speaker,
      text: w.word,          // or w.punctuated_word if you prefer
      confidence: w.confidence,
      language: w.language
    });
  }

  // Remove from ephemeralWords any keys not in newPartialMap
  for (const oldKey of ephemeralWords.keys()) {
    if (!newPartialMap.has(oldKey)) {
      ephemeralWords.delete(oldKey);
    }
  }

  // Add or update ephemeralWords from newPartialMap
  for (const [k, wordObj] of newPartialMap) {
    if (!ephemeralWords.has(k)) {
      // brand new
      ephemeralWords.set(k, wordObj);
    } else {
      // possibly speaker changed or text changed
      const existing = ephemeralWords.get(k);
      // if anything changed, update
      if (existing.speaker !== wordObj.speaker || existing.text !== wordObj.text) {
        ephemeralWords.set(k, wordObj);
      }
    }
  }
}

/**
 * Creates a unique string key from start/end times. Round to 2 decimals to reduce floating issues.
 * @param {number} start
 * @param {number} end
 * @returns {string} e.g. "3.44-4.08"
 */
function makeWordKey(start, end) {
  const s = start.toFixed(2);
  const e = end.toFixed(2);
  return `${s}-${e}`;
}

/**
 * Builds paragraphs from an array of ephemeral word objects,
 * using speaker changes, time gaps >= 3s, or >=3 sentence enders to split paragraphs.
 *
 * @param {Array} wordObjects - ephemeral or final word objects: {start, end, speaker, text}
 * @returns {Array} paragraphs, each of shape { speaker, text, endTime, sentenceCount }
 */
function buildParagraphsFromWords(wordObjects) {
  if (!wordObjects.length) return [];

  // Sort by start time
  wordObjects.sort((a, b) => a.start - b.start);

  let paragraphs = [];
  let currentPara = null;

  for (const w of wordObjects) {
    if (!currentPara) {
      currentPara = createParagraph(w);
      continue;
    }
    const timeGap = w.start - currentPara.endTime;
    const sameSpeaker = (w.speaker === currentPara.speaker);
    const newSentenceCount = currentPara.sentenceCount + countSentenceEnders(w.text);

    // If big gap, or speaker changed, or too many sentences => new paragraph
    if (timeGap >= TIME_GAP_THRESHOLD || !sameSpeaker || newSentenceCount >= MAX_SENTENCES_PER_PARAGRAPH) {
      // push old one
      paragraphs.push(currentPara);
      // start new
      currentPara = createParagraph(w);
    } else {
      // append
      currentPara.text += " " + w.text;
      currentPara.endTime = w.end;
      currentPara.sentenceCount = newSentenceCount;
    }
  }

  // push the last paragraph
  if (currentPara) {
    paragraphs.push(currentPara);
  }
  return paragraphs;
}

/**
 * Creates a fresh paragraph object from a single word object.
 * @param {object} w
 * @returns {object} paragraph
 */
function createParagraph(w) {
  return {
    speaker: w.speaker,
    text: w.text,
    endTime: w.end,
    sentenceCount: countSentenceEnders(w.text)
  };
}

/**
 * Builds a user-visible transcript from final paragraphs + ephemeral paragraphs,
 * respecting minimal repeated speaker labels.
 *
 * @param {Array} finalParas
 * @param {Array} ephemeralParas
 * @returns {string}
 */
function buildDisplayTranscript(finalParas, ephemeralParas) {
  const combined = [...finalParas, ...ephemeralParas];
  if (!combined.length) return "";

  let lines = [];
  let lastSpeaker = null;

  for (const para of combined) {
    if (para.speaker !== lastSpeaker) {
      // label once
      lines.push(`speaker ${para.speaker}: ${para.text.trim()}`);
      lastSpeaker = para.speaker;
    } else {
      // same speaker => new line, no label
      lines.push(para.text.trim());
    }
  }
  return lines.join("\n");
}

/**
 * Counts the approximate number of sentence enders (., ? or !) in a given text.
 * @param {string} text
 * @returns {number} how many enders found
 */
function countSentenceEnders(text) {
  const matches = text.match(/[.!?]+/g);
  return matches ? matches.length : 0;
}

/**
 * For final transcripts, handle translations/pasting based on user settings.
 * @param {string} transcript
 * @param {boolean} isFinal
 */
async function handleTranslationAndPasting(transcript, isFinal) {
  const pasteOption = document.getElementById('pasteOption').value;
  const translationEnabled = appState.enableTranslation;
  if (!isFinal) return;

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
