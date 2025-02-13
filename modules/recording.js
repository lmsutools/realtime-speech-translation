import { translateWithAI } from './translation.js';
import { pasteText } from './utils.js';
import { isInputDeviceAvailable } from './devices.js';
import { getStoreValue } from './storeBridge.js';

let mediaRecorder;
let socket;
let transcriptions = [];
let translations = [];

export async function startRecording() {
  // Reset socket to null at the BEGINNING.
  socket = null;
  try {
    // Get settings from persistent store
    const selectedModel = await getStoreValue('model', 'nova-2');
    const selectedLanguage = await getStoreValue('sourceLanguage', null);
    const targetLanguage = await getStoreValue('targetLanguage', 'en');
    const diarizationEnabled = (await getStoreValue('diarizationEnabled', false)) === true;
    const translationEnabled = (await getStoreValue('enableTranslation', false)) === true;
    const selectedDeviceId = await getStoreValue('defaultInputDevice', '');
    const deepgramKey = await getStoreValue('deepgramApiKey', '');
    
    // --- Get AI Provider Settings from persistent store ---
    const defaultAiProviderId = await getStoreValue('translateDefaultAiProvider', 'openai');
    const providersJson = await getStoreValue('aiProviders', '[]');
    const aiProviders = JSON.parse(providersJson);
    const defaultAiProvider = aiProviders.find(provider => provider.id === defaultAiProviderId);
    const defaultAiModel = await getStoreValue('translateDefaultAiModel', defaultAiProvider.defaultModel);

    if (!selectedLanguage) {
      console.error("No source language selected.");
      return;
    }
    if (!targetLanguage) {
      console.error("No target language selected.");
      return;
    }
    if (selectedDeviceId && !(await isInputDeviceAvailable(selectedDeviceId))) {
      console.warn(`Previously selected input device (${selectedDeviceId}) is not available.`);
      await setStoreValue('defaultInputDevice', '');
      document.getElementById('source-text').textContent = 'Previously selected input device is not available. Using default device.';
    }
    
    let stream;
    if (selectedDeviceId) {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: selectedDeviceId } });
    } else {
      console.warn("Using default input device.");
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      document.getElementById('source-text').textContent = 'Using default input device.';
    }
    mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
    
    // Build query parameters for Deepgram’s /listen endpoint.
    let queryParams = `?model=${selectedModel}&language=${selectedLanguage}&punctuate=true`;
    if (diarizationEnabled) {
      queryParams += `&diarize=true`;
    }
    // Create a new WebSocket connection.
    socket = new WebSocket(`wss://api.deepgram.com/v1/listen${queryParams}`, ['token', deepgramKey]);
    
    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      document.getElementById('source-text').textContent = "Deepgram connection failed. Please check your API key and network.";
      document.getElementById('start').style.display = 'block';
      document.getElementById('stop').style.display = 'none';
    };
    
    socket.onmessage = async (msg) => {
      const parsed = JSON.parse(msg.data || '{}');
      const transcript = parsed?.channel?.alternatives[0]?.transcript;
      if (transcript) {
        console.log(transcript);
        if (
          document.getElementById('source-text').textContent === 'Previously selected input device is not available. Using default device.' ||
          document.getElementById('source-text').textContent === 'Using default input device.' ||
          document.getElementById('source-text').textContent === 'Deepgram connection failed. Please check your API key and network.'
        ) {
          document.getElementById('source-text').textContent = '';
        }
        document.getElementById('source-text').textContent += ` ${transcript}`;
        transcriptions.push(transcript);
        if (transcriptions.length > 10) {
          transcriptions.shift();
        }
        const pasteOption = document.getElementById('pasteOption').value;
        if (pasteOption === 'source') {
          pasteText(transcript);
        }
        if (translationEnabled) {
          const translation = await translateWithAI(transcript, transcriptions.join(' '), translations.join(' '));
          translations.push(translation);
          if (translations.length > 10) {
            translations.shift();
          }
          console.log('translation', translation);
          document.getElementById('translated-text').textContent += ` ${translation}`;
          if (pasteOption === 'translated') {
            pasteText(translation);
          }
        }
      }
    };
    
    socket.onclose = () => {
      console.log('WebSocket connection closed');
    };
    
    socket.onopen = () => {
      document.getElementById('source-text').textContent = '';
      mediaRecorder.start(50);
      console.log('MediaRecorder started');
      console.log("Using AI Provider on Start:", defaultAiProvider.name);
      console.log("Using AI Model on Start:", defaultAiModel);
    };
    
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0 && socket?.readyState === WebSocket.OPEN) {
        socket.send(event.data);
      }
    };
    
    document.getElementById('start').style.display = 'none';
    document.getElementById('stop').style.display = 'block';
  } catch (error) {
    console.error('Error starting recording:', error);
  }
}

export function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
    console.log('Recording stopped');
  }
  if (socket) {
    socket.close();
    socket = null;
  }
  document.getElementById('start').style.display = 'block';
  document.getElementById('stop').style.display = 'none';
}
