require('dotenv').config()

let audioContext;  // Global AudioContext instance for managing audio operations.
let virtualAudioOutputDevice;  // Holds the details of the VB-Audio Virtual Cable output device.
let mediaRecorder;  // MediaRecorder instance to capture audio from the microphone.
let socket;  // WebSocket connection to the Deepgram API for live transcription.
let ttsSocket;  // WebSocket connection for Text-to-Speech (TTS) with Deepgram.
let audioQueue = [];  // Queue to buffer audio data from TTS responses.
let isPlaying = false;  // Flag to check if audio is currently being played.
let MAX_QUEUE_LENGTH = 50; // Limit the length of the audio queue to prevent overflow
let transcriptions = [];
let translations = [];

const languageSelect = document.getElementById('language');
languageSelect.addEventListener('change', () => {
    if (socket) {
        stopRecording();
        startRecording();
    }
});


/**
 * Initializes the global AudioContext for managing audio output.
 * Fetches available audio output devices and looks for a virtual device (VB-Audio Virtual Cable).
 * This ensures that audio can be routed to a specific output if needed.
 */
async function initAudioContext() {
    // Initializes AudioContext if not already initialized
    if (!audioContext) {
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'interactive' });
            console.log('AudioContext created successfully');

            // Fetch and filter audio output devices
            const devices = await navigator.mediaDevices.enumerateDevices();
            const audioOutputDevices = devices.filter(device => device.kind === 'audiooutput');

            // Log the available audio output devices
            console.log('Audio output devices:', JSON.stringify(audioOutputDevices, null, 2));

            // Look for VB-Audio Virtual Cable
            virtualAudioOutputDevice = audioOutputDevices.find(device =>
                device.label.toLocaleLowerCase().includes('cable') || device.label.toLocaleLowerCase().includes('blackhole')
            );

            if (virtualAudioOutputDevice) {
                console.log('VB-Audio Cable output device found:', virtualAudioOutputDevice.label);
            } else {
                console.error('VB-Audio Cable output device not found');
            }
        } catch (error) {
            console.error('Error initializing audio context:', error);
        }
    } else {
        console.log('AudioContext already initialized');
    }
}


/**
 * Decodes raw PCM (Pulse Code Modulation) data, typically received as 16-bit audio,
 * into a format usable by Web Audio API (Float32Array).
 * @param {ArrayBuffer} arrayBuffer - The raw PCM audio data.
 * @returns {Promise<Float32Array>} Decoded audio data.
 */
async function decodePCMData(arrayBuffer) {
    const view = new DataView(arrayBuffer);
    const samples = new Float32Array(view.byteLength / 2); // Assuming 16-bit PCM data

    for (let i = 0; i < samples.length; i++) {
        const sample = view.getInt16(i * 2, true); // Read 16-bit samples in little-endian format
        samples[i] = sample / 0x7FFF; // Normalize the audio data between -1 and 1
    }

    return samples;
}

/**
 * Process audio data by decoding PCM data and creating an audio buffer.
 * This function is asynchronous to allow for non-blocking processing of audio.
 * @param {ArrayBuffer} audioData - The raw audio data received.
 * @returns {Promise<AudioBuffer>} A Promise that resolves to an AudioBuffer.
 */
async function processAudio(audioData) {
    const decodedPCM = await decodePCMData(audioData);
    const buffer = audioContext.createBuffer(1, decodedPCM.length, 48000);
    buffer.copyToChannel(decodedPCM, 0);
    return buffer;
}


/**
 * Plays audio from the queue either to the default output or the VB-Audio Virtual Cable.
 * This function manages the playback queue, ensuring audio is played one by one.
 * @param {boolean} isVirtualCable - If true, audio is played to the VB-Audio Virtual Cable; otherwise, it is played to the default output.
 */
async function playQueuedAudio(isVirtualCable = false, skipBufferCheck = false) {
    if (isPlaying || audioQueue.length === 0) return;  // Avoid redundant checks

    if (audioQueue.length < 2 && !skipBufferCheck) {
        setTimeout(() => playQueuedAudio(isVirtualCable, true), 200);
        return;
    }

    isPlaying = true;

    try {
        const totalLength = audioQueue.reduce((acc, curr) => acc + curr.byteLength, 0);
        const concatenatedBuffer = new ArrayBuffer(totalLength);
        const uint8Array = new Uint8Array(concatenatedBuffer);
        let offset = 0;

        audioQueue.forEach(buffer => {
            uint8Array.set(new Uint8Array(buffer), offset);
            offset += buffer.byteLength;
        });

        audioQueue = [];

        const buffer = await processAudio(concatenatedBuffer);

        const source = audioContext.createBufferSource();  // Create an audio source from the decoded data
        source.buffer = buffer;

        // Depending on the output device, choose where to play the audio
        if (isVirtualCable) {
            playAudioToVirtualCable(source);
        } else {
            playAudioToDefaultOutput(source);
        }

        source.onended = () => {
            source.buffer = null;  // Release memory after playback
            isPlaying = false;
            if (audioQueue.length > 0) {
                playQueuedAudio(isVirtualCable);  // Play next in queue
            }
        };

        source.start();
    } catch (error) {
        console.error("Error during audio playback:", error);
        isPlaying = false;
    }
}


/**
 * Plays audio through the system's default audio output device.
 * @param {AudioBufferSourceNode} source - The audio source node to be played.
 */
function playAudioToDefaultOutput(source) {
    source.connect(audioContext.destination);  // Route the audio to the system's default audio output
}

/**
 * Plays audio through the virtual audio output device (VB-Audio Virtual Cable).
 * This allows the audio to be routed through the VB-Audio device for further processing.
 * @param {AudioBufferSourceNode} source - The audio source node to be played.
 */
function playAudioToVirtualCable(source) {
    const streamDestination = audioContext.createMediaStreamDestination();  // Create a destination for the audio stream
    source.connect(streamDestination);

    const audioElement = new Audio();  // Create a new audio element to play the stream
    audioElement.srcObject = streamDestination.stream;
    audioElement.setSinkId(virtualAudioOutputDevice.deviceId);  // Set the output device to the virtual cable

    audioElement.play();  // Start playing the audio
}

/**
 * Gets the audio input device that is not the virtual audio cable to avoid looping input.
 * @returns {Promise<MediaStream>} - A promise that resolves to the media stream of the correct input device.
 */
async function getCorrectInputDevice() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputDevices = devices.filter(device => device.kind === 'audioinput');

        // Look for a device that is NOT the virtual audio cable
        const correctDevice = audioInputDevices.find(device => 
            !device.label.toLowerCase().includes('cable') && 
            !device.label.toLowerCase().includes('blackhole')
        );

        if (!correctDevice) {
            throw new Error('No valid input device found (e.g., microphone)');
        }

        console.log('Using input device:', correctDevice.label);

        // Get the media stream of the selected input device
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: { deviceId: correctDevice.deviceId }
        });

        return stream;
    } catch (error) {
        console.error('Error selecting input device:', error);
    }
}


/**
 * Captures audio from the user's microphone and streams it to a WebSocket (Deepgram API) for live transcription.
 */
async function startRecording() {
    try {
        await initAudioContext(); // Initialize the AudioContext for audio operations

        // Request access to the user's microphone
        const stream = await getCorrectInputDevice()
        mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });

        const selectedLanguage = document.getElementById('language').value;

        socket = new WebSocket(`wss://api.deepgram.com/v1/listen?model=nova-2&language=${selectedLanguage}`, ['token', process.env.DEEPGRAM_KEY]);

        // Handle incoming WebSocket messages containing transcriptions
        socket.onmessage = async (msg) => {
            const { transcript } = JSON.parse(msg.data || '{}')?.channel?.alternatives[0];
            if (transcript) {
                console.log(transcript);
                document.getElementById('source-text').textContent += ` ${transcript}`;
                transcriptions.push(transcript);
                // keep the last 10 transcriptions
                if (transcriptions.length > 10) {
                    transcriptions.shift();
                }
                const translation = await translateWithAI(transcript, transcriptions.join(' '), translations.join(' '));
                translations.push(translation)
                // keep the last 10 translations
                if (translations.length > 10) {
                    translations.shift();
                }
                console.log('translation', translation);
                document.getElementById('translated-text').textContent += ` ${translation}`;

                await sendToTTS(translation);  // Send the transcript to TTS for audio playback
            }
        };

        socket.onerror = (error) => {
            console.error('WebSocket error:', error);
        };

        socket.onclose = () => {
            console.log('WebSocket connection closed');
        };

        // Start recording audio when WebSocket connection is opened
        socket.onopen = () => {
            mediaRecorder.start(50);  // Send audio data in chunks every 50ms
            console.log('MediaRecorder started');
        };

        // Send recorded audio data to WebSocket for processing
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


/**
 * Sends the transcription result to the Text-To-Speech (TTS) WebSocket to convert it to speech audio.
 * @param {string} transcript - The transcription text to be converted to speech.
 */
async function sendToTTS(transcript) {
    if (!ttsSocket || ttsSocket?.readyState === WebSocket.CLOSED) {
        setupTTSSocket(transcript);
    } else {
        // Send the transcript to the TTS WebSocket
        ttsSocket.send(JSON.stringify({
            "type": "Speak",
            "text": transcript,
        }));

        // Start playing the audio
        ttsSocket.send(JSON.stringify({
            "type": "Flush",
        }));
    }
}

/**
 * Manages the incoming TTS data and queues it for playback.
 * This method ensures that the audio queue does not grow indefinitely.
 * @param {ArrayBuffer} arrayBuffer - The raw audio data received.
 */
function queueAudioData(arrayBuffer) {
    if (audioQueue.length >= MAX_QUEUE_LENGTH) {
        audioQueue.shift();  // Remove old audio data to prevent overflow
    }
    audioQueue.push(arrayBuffer);  // Add the new audio data to the queue
}

/**
 * Initializes the WebSocket connection for Text-To-Speech (TTS) and plays the resulting audio.
 * @param {string} transcript - The text to be converted to speech.
 */
function setupTTSSocket(transcript) {
    ttsSocket = new WebSocket('wss://api.deepgram.com/v1/speak?encoding=linear16&sample_rate=48000', ['token', process.env.DEEPGRAM_KEY]);

    ttsSocket.onopen = () => {
        console.log('TTS WebSocket connection opened');
        ttsSocket.send(JSON.stringify({ "type": "Speak", "text": transcript }));
        ttsSocket.send(JSON.stringify({ "type": "Flush" }));
    };

    ttsSocket.onmessage = async (ttsMsg) => {
        try {
            if (ttsMsg.data instanceof Blob) {
                const arrayBuffer = await ttsMsg.data.arrayBuffer();
                queueAudioData(arrayBuffer);  // Queue the audio data for playback
                playQueuedAudio(true);  // Play the queued audio
            }
        } catch (error) {
            console.error('Error decoding TTS audio data:', error);
        }
    };

    ttsSocket.onerror = (error) => {
        console.error('TTS WebSocket error:', error);
    };

    ttsSocket.onclose = () => {
        console.log('TTS WebSocket connection closed');
        ttsSocket = null;
    };
}

/**
 * Stops the audio recording, closes the WebSocket connections, and shuts down the AudioContext.
 */
function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();  // Stop the MediaRecorder
        console.log('Recording stopped');
    }
    if (socket) {
        socket.close();  // Close the transcription WebSocket
        socket = null;
    }

    document.getElementById('start').style.display = 'block';
    document.getElementById('stop').style.display = 'none';
}


// Listeners for start and stop buttons on the UI
document.getElementById('stop').addEventListener('click', stopRecording);
document.getElementById('start').addEventListener('click', startRecording);


const translate = async (text) => {
    const url = `https://translation.googleapis.com/language/translate/v2?key=${process.env.GOOGLE_APPLICATION_SECRET}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            q: text,
            target: 'en',
        }),
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.data.translations[0].translatedText;
};

const translateWithAI = async (text, context, translationContext) => {
    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [
                    {
                        role: 'user',
                        content: `
### **Translation Guidelines**:

1. **Contextual Continuity**: Use the provided context to predict and translate the next word, ensuring the translation flows naturally.
2. **Accuracy & Brevity**: Ensure translations are concise, grammatically correct, and contextually appropriate (e.g., if the context is "My name" and the next word is "Mohammed," the output should be "is Mohammed").
3. **Preserve English Words**: If a word is already in English, maintain it as-is without translating.
4. **Names & Locations**: Retain original names and geographic locations without translation.
5. **Omit Quotation Marks**: Do not include quotation marks or any other special characters in the output.
6. **Skip Ambiguous Words**: If uncertain about a word’s translation, skip it instead of providing a potentially incorrect output.
7. **No Redundancies**: Avoid repeating words already translated in the context (e.g., if the context is "my name," do not output "my name" again; instead, continue with "is").
8. **Avoid Over-translation**: Do not retranslate words that are already accurately translated in the context (e.g., if the context says "my name is Mohammad" and the next input is "है," no translation is needed as "is" is already included).
9. **Natural Translation**: Ensure the translation reflects natural phrasing in English (e.g., avoid outputting direct, repetitive translations such as "My name is My name is Mohammad").
10. **Speed & Precision**: Prioritize fast and precise translations, suitable for real-time use, while ensuring word-for-word accuracy.

### **Examples**:

#### **Example 1**:
- **Input**:  
  Text: "महात्मा"  
  Context: "मेरा नाम"  
  Next word: "है"  
- **Output**:  
  "is Mahatma"

#### **Example 2**:
- **Input**:  
  Text: "profesor"  
  Context: "Él es"  
  Next word: "un"  
- **Output**:  
  "a teacher"

#### **Example 3**:
- **Input**:  
  Text: "bonjour"  
  Context: "He greeted her saying"  
  Next word: "!"  
- **Output**:  
  "hello"

#### **Example 4**:
- **Input**:  
  Text: "Escuela"  
  Context: "Estamos en la"  
  Next word: "del"  
- **Output**:  
  "school"

  #### Translate the following text to English:
- **Input**:  
  Text: "${text}" 
  Input Context: "${context}" 
  Translation Context: "${translationContext}"
  Output:
                        `,
                    },
                ],
            }),
        });

        if (!response.ok) {
            console.error(`Error in translation request: ${response.statusText}`);
            return '';
        }

        const { choices } = await response.json();
        return (choices[0]?.message?.content || '').replaceAll('"','').replaceAll(`'`,''); // Return translation if available, otherwise empty string.
    } catch (error) {
        console.error('Error during translation:', error.message);
        return '';
    }
};
