
import { getCorrectInputDevice } from './devices.js';
import { translateWithAI } from './translation.js';
import { pasteText } from './utils.js';

let mediaRecorder;      // For capturing audio.
let socket;             // WebSocket connection to Deepgram.
let transcriptions = [];  // Store recent transcription segments.
let translations = [];    // Store recent translation segments.

export async function startRecording() {
  try {
    const stream = await getCorrectInputDevice();
    mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
    const selectedModel = document.getElementById('model').value;
    const selectedLanguage = document.getElementById('language').value;
    const diarizationEnabled = document.getElementById('diarization').checked;

    // Build query parameters (punctuation is always enabled)
    let queryParams = `?model=${selectedModel}&language=${selectedLanguage}&punctuate=true`;
    if (diarizationEnabled) {
      queryParams += `&diarize=true`;
    }

    socket = new WebSocket(`wss://api.deepgram.com/v1/listen${queryParams}`, ['token', process.env.DEEPGRAM_KEY]);

    socket.onmessage = async (msg) => {
      const parsed = JSON.parse(msg.data || '{}');
      const transcript = parsed?.channel?.alternatives[0]?.transcript;
      if (transcript) {
        console.log(transcript);
        document.getElementById('source-text').textContent += ` ${transcript}`;
        transcriptions.push(transcript);
        if (transcriptions.length > 10) {
          transcriptions.shift();
        }
        // Check auto-paste option for source text.
        const pasteOption = document.getElementById('pasteOption').value;
        if (pasteOption === 'source') {
          pasteText(transcript);
        }
        // Only perform translation if enabled.
        const translationEnabled = document.getElementById('enableTranslation').checked;
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

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    socket.onclose = () => {
      console.log('WebSocket connection closed');
    };

    socket.onopen = () => {
      // Send audio data in 50ms chunks.
      mediaRecorder.start(50);
      console.log('MediaRecorder started');
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
