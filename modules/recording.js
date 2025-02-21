import { translateWithAI } from './translation.js';
import { pasteText } from './utils.js';
import { isInputDeviceAvailable } from './devices.js';
import { appState } from '../stores/appState.js';
import { ipcRenderer } from 'electron';

let mediaRecorder;
let socket;
let transcriptions = [];
let translations = [];
let deepgramCaptions = [];
let finalTranscription = "";
let autoStopTimerId = null;
let typingActive = false;

ipcRenderer.on('typing-app-typing-mode-changed', (event, isActive) => { 
  typingActive = isActive; 
});

export async function startRecording() {
  socket = null;
  try {
    const combined = appState.sourceLanguage;
    const [selectedModel, selectedLanguage] = combined.split("|");
    const targetLanguage = appState.targetLanguage;
    const diarizationEnabled = appState.diarizationEnabled;
    const translationEnabled = appState.enableTranslation;
    const selectedDeviceId = await ipcRenderer.invoke('store-get', 'defaultInputDevice', '');
    let deepgramKey = appState.deepgramApiKey; // Try appState first

    // If appState.deepgramApiKey is empty, fetch from store
    if (!deepgramKey) {
      deepgramKey = await ipcRenderer.invoke('store-get', 'deepgramApiKey', '');
      if (deepgramKey) {
        const { runInAction } = require("mobx");
        runInAction(() => {
          appState.setDeepgramApiKey(deepgramKey);
        });
        console.log('[Recording] Fetched deepgramApiKey from store:', deepgramKey);
      }
    }

    console.log('[Recording] Using deepgramApiKey:', deepgramKey); // Debug log

    if (!deepgramKey) {
      console.error('[Recording] No Deepgram API key set');
      document.getElementById('source-text').textContent = 'Please set a Deepgram API key in settings.';
      ipcRenderer.send('typing-app-recording-state-changed', false);
      return;
    }

    let stream;
    if (selectedDeviceId && await isInputDeviceAvailable(selectedDeviceId)) {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: selectedDeviceId } });
    } else {
      console.warn('[Recording] Using default input device');
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      document.getElementById('source-text').textContent = 'Using default input device.';
    }

    console.log('[Recording] Audio stream obtained');
    mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });

    let queryParams = `?model=${selectedModel}&language=${selectedLanguage}&punctuate=true&interim_results=true`;
    if (diarizationEnabled) {
      queryParams += `&diarize=true`;
    }

    socket = new WebSocket(`wss://api.deepgram.com/v1/listen${queryParams}`, ['token', deepgramKey]);

    socket.onerror = (error) => {
      console.error('[Recording] WebSocket error:', error);
      document.getElementById('source-text').textContent = "Deepgram connection failed.";
      ipcRenderer.send('typing-app-recording-state-changed', false);
    };

    socket.onmessage = async (msg) => {
      const parsed = JSON.parse(msg.data || '{}');
      const transcript = parsed?.channel?.alternatives[0]?.transcript;
      if (transcript) {
        console.log('[Recording] Transcript:', transcript);
        deepgramCaptions.push(parsed);
        if (parsed.is_final) {
          finalTranscription += " " + transcript;
          document.getElementById('source-text').textContent = finalTranscription;
          transcriptions.push(transcript);
          if (transcriptions.length > 10) { transcriptions.shift(); }
        } else {
          document.getElementById('source-text').textContent = finalTranscription + " " + transcript;
        }

        const pasteOption = document.getElementById('pasteOption').value;
        if (typingActive && parsed.is_final) {
          if (pasteOption === 'source') {
            pasteText(transcript);
          }
          if (pasteOption === 'translated' && translationEnabled) {
            const translation = await translateWithAI(transcript, transcriptions.join(' '), translations.join(' '));
            translations.push(translation);
            if (translations.length > 10) { translations.shift(); }
            document.getElementById('translated-text').textContent += ` ${translation}`;
            pasteText(translation);
          }
        } else if (!typingActive && parsed.is_final && translationEnabled && pasteOption === 'translated') {
          const translation = await translateWithAI(transcript, transcriptions.join(' '), translations.join(' '));
          translations.push(translation);
          if (translations.length > 10) { translations.shift(); }
          document.getElementById('translated-text').textContent += ` ${translation}`;
        }
      }
    };

    socket.onclose = () => {
      console.log('[Recording] WebSocket connection closed');
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

export function resetRecordingData() {
  transcriptions = [];
  translations = [];
  deepgramCaptions = [];
  finalTranscription = "";
  console.log('[Recording] Recording data reset');
}
