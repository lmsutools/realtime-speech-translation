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
let finalTranscription = "";     // final plain text when diarization is off
let finalParagraphs = [];        // final paragraphs when diarization is on
let ephemeralWords = new Map();  // ephemeral words during transcription
let autoStopTimerId = null;
let typingActive = false;
let preservedContent = "";       // Store content before a restart in its original format

// For paragraph splitting logic
const TIME_GAP_THRESHOLD = 3.0;           // seconds
const MAX_SENTENCES_PER_PARAGRAPH = 3;

// Predefined speaker label colors (for up to 10 speakers)
const speakerPillColors = ["#e91e63", "#9c27b0", "#673ab7", "#3f51b5", "#2196f3", "#03a9f4", "#00bcd4", "#009688", "#4caf50", "#8bc34a"];

ipcRenderer.on('typing-app-typing-mode-changed', (event, isActive) => {
  typingActive = isActive;
});

/*** Build plain text transcript from final and ephemeral paragraphs, excluding speaker labels.*/
function buildPlainTranscript(finalParas, ephemeralParas) {
  const combined = [...finalParas, ...ephemeralParas];
  return combined.map(para => para.text.trim()).join(' ');
}

/*** Convert plain text transcription to paragraph structure for diarization */
function convertTextToParagraphs(text) {
  if (!text.trim()) return [];
  return [{ speaker: 0, text: text.trim(), endTime: 0, sentenceCount: countSentenceEnders(text) }];
}

/*** Convert paragraphs to plain text transcription */
function convertParagraphsToText(paragraphs) {
  return paragraphs.map(p => p.text.trim()).join(' ');
}

/*** Called by the "Start" button. Opens the mic, sets up WebSocket to Deepgram */
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
        preservedContent = "";
        finalTranscription = "";
        finalParagraphs = [];
        ephemeralWords.clear();
        document.getElementById('source-text').textContent = '';
      }
      mediaRecorder.start(50);
      ipcRenderer.send('typing-app-recording-state-changed', true);
      console.log('[Recording] Recording started');
      const autoStopTimer = await ipcRenderer.invoke('store-get', 'autoStopTimer', 60);
      autoStopTimerId = setTimeout(() => {
        stopRecording();
        document.getElementById('source-text').textContent += "\n---TRANSCRIPTION STOPPED, TIME LIMIT REACHED---";
      }, autoStopTimer * 60000);
    };
    socket.onmessage = async (event) => {
      const parsed = JSON.parse(event.data || '{}');
      deepgramCaptions.push(parsed);
      const alt = parsed?.channel?.alternatives[0];
      if (!alt) return;
      const words = alt.words || [];
      const plainTranscript = alt.transcript || "";
      if (appState.diarizationEnabled) {
        syncEphemeralWords(ephemeralWords, words);
        if (!parsed.is_final) {
          const ephemeralParagraphs = buildParagraphsFromWords([...ephemeralWords.values()]);
          const newContent = buildHTMLTranscript(finalParagraphs, ephemeralParagraphs);
          document.getElementById('source-text').innerHTML = (preservedContent ? preservedContent + '<br>' : '') + newContent;
          const plainText = buildPlainTranscript(finalParagraphs, ephemeralParagraphs);
          ipcRenderer.send('typing-app-transcript-updated', plainText);
        } else {
          const ephemeralParagraphs = buildParagraphsFromWords([...ephemeralWords.values()]);
          finalParagraphs.push(...ephemeralParagraphs);
          ephemeralWords.clear();
          const newContent = buildHTMLTranscript(finalParagraphs, []);
          document.getElementById('source-text').innerHTML = (preservedContent ? preservedContent + '<br>' : '') + newContent;
          const plainText = buildPlainTranscript(finalParagraphs, []);
          ipcRenderer.send('typing-app-transcript-updated', plainText);
          transcriptions.push(plainTranscript);
          if (transcriptions.length > 10) transcriptions.shift();
          await handleTranslationAndPasting(plainTranscript, true);
          console.log('[Recording] All Deepgram Responses:', deepgramCaptions);
        }
      } else {
        handleNoDiarization(parsed);
      }
    };
    socket.onclose = () => { console.log('[Recording] WebSocket connection closed'); };
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

/*** Stop the recording and close the socket */
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

/*** Called by the "Reset" button in your UI */
export function onResetClicked() {
  const isRecordingActive = !!(mediaRecorder && mediaRecorder.state !== 'inactive' && socket);
  if (isRecordingActive) {
    finalParagraphs = [];
    ephemeralWords.clear();
    finalTranscription = "";
    deepgramCaptions = [];
    transcriptions = [];
    translations = [];
    preservedContent = "";
    document.getElementById('source-text').textContent = "";
    document.getElementById('translated-text').textContent = "";
    console.log('[Recording] Partial reset done. Recording continues...');
  } else {
    resetRecordingData();
  }
}

/*** If diarization is disabled, fallback approach */
function handleNoDiarization(parsed) {
  const alt = parsed?.channel?.alternatives[0];
  if (!alt) return;
  const transcript = alt.transcript || "";
  if (!transcript.trim()) return;
  if (parsed.is_final) {
    finalTranscription += " " + transcript;
    const newContent = finalTranscription.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    document.getElementById('source-text').innerHTML = (preservedContent ? preservedContent + '<br>' : '') + newContent;
    transcriptions.push(transcript);
    if (transcriptions.length > 10) { transcriptions.shift(); }
    handleTranslationAndPasting(transcript, true);
    ipcRenderer.send('typing-app-transcript-updated', finalTranscription);
  } else {
    const interimText = finalTranscription + " " + transcript;
    const newContent = interimText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    document.getElementById('source-text').innerHTML = (preservedContent ? preservedContent + '<br>' : '') + newContent;
    ipcRenderer.send('typing-app-transcript-updated', interimText);
  }
}

/*** The "full" reset for everything */
export function resetRecordingData() {
  transcriptions = [];
  translations = [];
  deepgramCaptions = [];
  finalTranscription = "";
  finalParagraphs = [];
  ephemeralWords.clear();
  preservedContent = "";
  document.getElementById('source-text').textContent = "";
  document.getElementById('translated-text').textContent = "";
  console.log('[Recording] Full recording data reset');
}

/*** Compare ephemeralWords with the new chunk of words from Deepgram */
function syncEphemeralWords(ephemeralMap, words) {
  const newMap = new Map();
  for (const w of words) {
    const key = makeWordKey(w.start, w.end);
    newMap.set(key, {
      start: w.start,
      end: w.end,
      speaker: w.speaker,
      text: w.word,
      confidence: w.confidence,
      language: w.language
    });
  }
  for (const oldKey of ephemeralMap.keys()) {
    if (!newMap.has(oldKey)) {
      ephemeralMap.delete(oldKey);
    }
  }
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

/*** Make a unique key for each ephemeral word */
function makeWordKey(start, end) {
  return `${start.toFixed(2)}-${end.toFixed(2)}`;
}

/*** Convert ephemeral or final word objects into paragraphs */
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

/*** Create a new paragraph from a single word */
function createParagraph(w) {
  return {
    speaker: w.speaker,
    text: w.text,
    endTime: w.end,
    sentenceCount: countSentenceEnders(w.text)
  };
}

/*** Build an HTML-based transcript */
function buildHTMLTranscript(finalParas, ephemeralParas) {
  const combined = [...finalParas, ...ephemeralParas];
  if (!combined.length) return "";
  let htmlParts = [];
  let lastSpeaker = null;
  for (const para of combined) {
    const spk = para.speaker;
    const txt = para.text.trim();
    if (spk !== lastSpeaker) {
      const color = getSpeakerColor(spk);
      const pill = `<span style="background-color: ${color};color: #fff;border-radius: 10px;padding: 2px 6px;margin-right: 6px;font-weight: 500;">speaker ${spk}</span>`;
      htmlParts.push(`<div>${pill} ${txt}</div>`);
      lastSpeaker = spk;
    } else {
      htmlParts.push(`<div>${txt}</div>`);
    }
  }
  return htmlParts.join("");
}

/*** Return color for given speaker ID */
function getSpeakerColor(speakerId) {
  return speakerPillColors[speakerId % speakerPillColors.length];
}

/*** Count sentence enders in text */
function countSentenceEnders(text) {
  const matches = text.match(/[.!?]+/g);
  return matches ? matches.length : 0;
}

/*** Preserve current content before restarting */
export function preserveCurrentContent() {
  if (appState.diarizationEnabled) {
    preservedContent = document.getElementById('source-text').innerHTML || buildHTMLTranscript(finalParagraphs, []);
  } else {
    preservedContent = document.getElementById('source-text').innerHTML || finalTranscription.trim();
  }
  finalParagraphs = [];
  finalTranscription = "";
  ephemeralWords.clear();
}

/*** If final transcript, handle translation/pasting */
async function handleTranslationAndPasting(transcript, isFinal) {
  if (!transcript.trim()) {
    console.log('[Recording] Empty transcript, skipping');
    return;
  }
  if (!isFinal) {
    console.log('[Recording] Not a final transcript, skipping');
    return;
  }
  const pasteOption = document.getElementById('pasteOption').value;
  const translationEnabled = appState.enableTranslation;
  console.log(`[Recording] Handling: transcript="${transcript}", pasteOption=${pasteOption}, translationEnabled=${translationEnabled}, typingActive=${typingActive}`);
  if (typingActive) {
    if (pasteOption === 'source') {
      console.log(`[Recording] Pasting source text: "${transcript}"`);
      await pasteText(transcript);
    } else if (pasteOption === 'translated' && translationEnabled) {
      console.log(`[Recording] Translating and pasting: "${transcript}"`);
      const translation = await translateWithAI(transcript, transcriptions.join(' '), translations.join(' '));
      document.getElementById('translated-text').textContent += " " + translation;
      if (translation.startsWith("Translation Error:")) {
        console.log(`[Recording] Translation failed: "${translation}", pasting original: "${transcript}"`);
        await pasteText(transcript);
      } else {
        console.log(`[Recording] Translation succeeded: "${translation}", pasting`);
        translations.push(translation);
        if (translations.length > 10) translations.shift();
        await pasteText(translation);
      }
    }
  } else {
    if (pasteOption === 'translated' && translationEnabled) {
      console.log(`[Recording] Translating (no typing): "${transcript}"`);
      const translation = await translateWithAI(transcript, transcriptions.join(' '), translations.join(' '));
      document.getElementById('translated-text').textContent += " " + translation;
      if (!translation.startsWith("Translation Error:")) {
        translations.push(translation);
        if (translations.length > 10) translations.shift();
      }
    }
  }
}
