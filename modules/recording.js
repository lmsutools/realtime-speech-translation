import { translateWithAI } from './translation.js';
import { pasteText } from './utils.js';
import { isInputDeviceAvailable } from './devices.js';
import { appState } from '../stores/appState.js';
import { ipcRenderer } from 'electron';
import { runInAction } from 'mobx';

// ======== GLOBALS ========
let mediaRecorder;
let socket;
let deepgramCaptions = [];       // store all raw Deepgram responses
let transcriptions = [];         // store final transcripts so far (for context)
let translations = [];           // store final translations so far (plain text, diarization-off)
let finalTranscription = "";     // final plain text when diarization is off
let finalParagraphs = [];        // final paragraphs when diarization is on
let translatedParagraphs = [];   // MIRROR finalParagraphs, but for translation (diarization-on)
let finalTranslationsPlain = ""; // MIRROR finalTranscription, but for translation (diarization-off)
let ephemeralWords = new Map();  // ephemeral words during transcription
let autoStopTimerId = null;
let typingActive = false;
let preservedContent = "";       // Store content before a restart in its original format

const TIME_GAP_THRESHOLD = 3.0;           // seconds
const MAX_SENTENCES_PER_PARAGRAPH = 3;

const speakerPillColors = [
  "#e91e63", "#9c27b0", "#673ab7", "#3f51b5",
  "#2196f3", "#03a9f4", "#00bcd4", "#009688",
  "#4caf50", "#8bc34a"
];

ipcRenderer.on('typing-app-typing-mode-changed', (event, isActive) => {
  typingActive = isActive;
});

function buildPlainTranscript(finalParas, ephemeralParas) {
  const combined = [...finalParas, ...ephemeralParas];
  return combined.map(para => para.text.trim()).join(' ');
}

function convertTextToParagraphs(text) {
  if (!text.trim()) return [];
  return [{
    speaker: 0,
    text: text.trim(),
    endTime: 0,
    sentenceCount: countSentenceEnders(text)
  }];
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
    const combined = appState.sourceLanguage;
    const [selectedModel, selectedLanguage] = combined.split('|');

    let deepgramKey = appState.deepgramApiKey;
    if (!deepgramKey) {
      deepgramKey = await ipcRenderer.invoke('store-get', 'deepgramApiKey', '');
      if (deepgramKey) runInAction(() => { appState.setDeepgramApiKey(deepgramKey); });
    }
    if (!deepgramKey) {
      document.getElementById('source-text').textContent = 'Please set a Deepgram API key in settings.';
      ipcRenderer.send('typing-app-recording-state-changed', false);
      return;
    }

    const selectedDeviceId = await ipcRenderer.invoke('store-get', 'defaultInputDevice', '');
    let stream;
    if (selectedDeviceId && await isInputDeviceAvailable(selectedDeviceId)) {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: selectedDeviceId } });
    } else {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!isRestart) document.getElementById('source-text').textContent = 'Using default input device.';
    }

    mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });

    let queryParams = `?model=${selectedModel}&language=${selectedLanguage}&punctuate=true&interim_results=true`;
    if (diarizationEnabled) {
      queryParams += '&diarize=true';
    }

    const wsUrl = `wss://api.deepgram.com/v1/listen${queryParams}`;
    socket = new WebSocket(wsUrl, ['token', deepgramKey]);

    socket.onerror = (error) => {
      document.getElementById('source-text').textContent = "Deepgram connection failed.";
      ipcRenderer.send('typing-app-recording-state-changed', false);
    };

    socket.onopen = async () => {
      runInAction(() => { appState.setIsRecording(true); });

      // clear and reset for new session!
      if (isRestart && preservedContent) {
        document.getElementById('source-text').innerHTML = preservedContent + '<br>';
      } else if (!isRestart) {
        preservedContent = "";
        finalTranscription = "";
        finalParagraphs = [];
        finalTranslationsPlain = "";
        translatedParagraphs = [];
        translations = [];
        deepgramCaptions = [];
        ephemeralWords.clear();

        document.getElementById('source-text').textContent = '';
        document.getElementById('translated-text').textContent = '';
      }
      mediaRecorder.start(50);
      ipcRenderer.send('typing-app-recording-state-changed', true);

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
          // INTERIM, build ephemeral paragraphs transcript
          const ephemeralParagraphs = buildParagraphsFromWords([...ephemeralWords.values()]);
          const newContent = buildHTMLTranscript(finalParagraphs, ephemeralParagraphs);
          document.getElementById('source-text').innerHTML = (preservedContent ? preservedContent + '<br>' : '') + newContent;

          const plainText = buildPlainTranscript(finalParagraphs, ephemeralParagraphs);
          ipcRenderer.send('typing-app-transcript-updated', plainText);
        } else {
          // IS FINAL: push new paragraph(s)
          const ephemeralParagraphs = buildParagraphsFromWords([...ephemeralWords.values()]);
          finalParagraphs.push(...ephemeralParagraphs);
          ephemeralWords.clear();

          const newContent = buildHTMLTranscript(finalParagraphs, []);
          document.getElementById('source-text').innerHTML = (preservedContent ? preservedContent + '<br>' : '') + newContent;

          // For translation:
          await handleFinalParagraphsTranslation(ephemeralParagraphs);

          const plainText = buildPlainTranscript(finalParagraphs, []);
          ipcRenderer.send('typing-app-transcript-updated', plainText);
          transcriptions.push(plainTranscript);
          if (transcriptions.length > 10) transcriptions.shift();
        }
      } else {
        handleNoDiarization(parsed);
      }
    };

    socket.onclose = () => { };

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0 && socket?.readyState === WebSocket.OPEN) {
        socket.send(e.data);
      }
    };
    document.getElementById('start').style.display = 'none';
    document.getElementById('stop').style.display = 'block';
  } catch (error) {
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
  }
  if (socket) { socket.close(); socket = null; }
  runInAction(() => { appState.setIsRecording(false); });
  ipcRenderer.send('typing-app-recording-state-changed', false);
  if (autoStopTimerId) { clearTimeout(autoStopTimerId); autoStopTimerId = null; }
  document.getElementById('start').style.display = 'block';
  document.getElementById('stop').style.display = 'none';
}

export function onResetClicked() {
  const isRecordingActive = !!(mediaRecorder && mediaRecorder.state !== 'inactive' && socket);
  if (isRecordingActive) {
    finalParagraphs = [];
    translatedParagraphs = [];
    ephemeralWords.clear();
    finalTranscription = "";
    finalTranslationsPlain = "";
    deepgramCaptions = [];
    transcriptions = [];
    translations = [];
    preservedContent = "";
    document.getElementById('source-text').textContent = "";
    document.getElementById('translated-text').textContent = "";
  } else {
    resetRecordingData();
  }
}

function handleNoDiarization(parsed) {
  const alt = parsed?.channel?.alternatives[0];
  if (!alt) return;
  const transcript = alt.transcript || "";
  if (!transcript.trim()) return;
  if (parsed.is_final) {
    // append to final transcription
    finalTranscription += " " + transcript;

    const newContent = finalTranscription.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    document.getElementById('source-text').innerHTML = (preservedContent ? preservedContent + '<br>' : '') + newContent;

    transcriptions.push(transcript);
    if (transcriptions.length > 10) { transcriptions.shift(); }

    // TRANSLATE and UPDATE translation pane (append, do not overwrite)
    handleTranslationAndPastingNoDiarization(transcript, true);

    ipcRenderer.send('typing-app-transcript-updated', finalTranscription);
  } else {
    // show interim
    const interimText = finalTranscription + " " + transcript;
    const newContent = interimText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    document.getElementById('source-text').innerHTML = (preservedContent ? preservedContent + '<br>' : '') + newContent;

    ipcRenderer.send('typing-app-transcript-updated', interimText);
  }
}

export function resetRecordingData() {
  transcriptions = [];
  translations = [];
  deepgramCaptions = [];
  finalTranscription = "";
  finalParagraphs = [];
  translatedParagraphs = [];
  finalTranslationsPlain = "";
  ephemeralWords.clear();
  preservedContent = "";
  document.getElementById('source-text').textContent = "";
  document.getElementById('translated-text').textContent = "";
}

// -- Paragraph logic helpers unchanged --
// ... [all other helper functions here, not edited, e.g. buildParagraphsFromWords, buildHTMLTranscript etc.] ...

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

function makeWordKey(start, end) {
  return `${start.toFixed(2)}-${end.toFixed(2)}`;
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
    text: w.text,
    endTime: w.end,
    sentenceCount: countSentenceEnders(w.text)
  };
}

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

function getSpeakerColor(speakerId) {
  return speakerPillColors[speakerId % speakerPillColors.length];
}

function countSentenceEnders(text) {
  const matches = text.match(/[.!?]+/g);
  return matches ? matches.length : 0;
}

export function preserveCurrentContent() {
  if (appState.diarizationEnabled) {
    preservedContent = document.getElementById('source-text').innerHTML || buildHTMLTranscript(finalParagraphs, []);
  } else {
    preservedContent = document.getElementById('source-text').innerHTML || finalTranscription.trim();
  }
  finalParagraphs = [];
  translatedParagraphs = [];
  finalTranscription = "";
  finalTranslationsPlain = "";
  ephemeralWords.clear();
}

// ========== NEW: Handle translations in diarization mode ============

async function handleFinalParagraphsTranslation(newParagraphs) {
  // Only called when diarization is ON, with the final batch of ephemeral paragraphs (now finalized)
  if (!appState.enableTranslation) return;

  const translatedTextElem = document.getElementById('translated-text');
  if (!translatedTextElem) return;
  // Show translating
  translatedTextElem.textContent = "Translating...";

  for (const para of newParagraphs) {
    let translationOutput = "";
    try {
      translationOutput = await translateWithAI(para.text.trim(), "", "");
    } catch (err) {
      translationOutput = "Translation Error: " + (err?.message || '' + err);
    }

    // mirror the structure for translatedParagraphs; keep speaker, paragraph, etc.
    translatedParagraphs.push({
      speaker: para.speaker,
      text: translationOutput
    });
  }

  // After processing, rebuild translation pane identically to source pane's paragraph display, but with translated text
  translatedTextElem.innerHTML = buildTranslatedHTMLTranscript(translatedParagraphs);
}

function buildTranslatedHTMLTranscript(paragraphs) {
  if (!paragraphs.length) return "";
  let htmlParts = [];
  let lastSpeaker = null;
  for (const para of paragraphs) {
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

// ========== NEW: Handle translations in normal (non-diarization) mode ============

async function handleTranslationAndPastingNoDiarization(transcript, isFinal) {
  if (!isFinal) return;

  const translationEnabled = appState.enableTranslation;
  const pasteOption = document.getElementById('pasteOption').value;
  const translatedTextElem = document.getElementById('translated-text');

  let translationError = "";
  let translation = "";

  if (translationEnabled && translatedTextElem) {
    translatedTextElem.textContent = "Translating...";
    try {
      translation = await translateWithAI(transcript, transcriptions.join(' '), translations.join(' '));
      if (translation.startsWith("Translation Error:") || translation.endsWith("API key not set.") || translation.endsWith("not configured.")) {
        translationError = translation;
        translation = "";
      }
    } catch (err) {
      translationError = "Translation Error: " + (err?.message || '' + err);
      translation = "";
    }
  }

  // For mirroring: accumulate translation exactly as plain transcript
  if (translation) {
    if (finalTranslationsPlain) {
      finalTranslationsPlain += " " + translation;
    } else {
      finalTranslationsPlain = translation;
    }
    translatedTextElem.textContent = finalTranslationsPlain;
    translations.push(translation);
    if (translations.length > 10) translations.shift();
  } else if (translationError && translatedTextElem) {
    translatedTextElem.textContent = translationError;
  }

  // Paste logic (if needed)
  if (typingActive) {
    if (pasteOption === 'source') {
      await pasteText(transcript);
    } else if (pasteOption === 'translated' && translationEnabled) {
      if (translation) {
        await pasteText(translation);
      } else if (translationError) {
        await pasteText(transcript); // fallback to source
      }
    }
  } else {
    if (pasteOption === 'translated' && translationEnabled) {
      // do nothing, just show in translation pane
    }
  }
}

// ========== END OF MODULE EXPORTS ==========

