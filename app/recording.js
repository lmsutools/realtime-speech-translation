
// Constants and necessary configurations
const DIARIZE_ENABLED = false; // Set diarize to false as required
let ephemeralWords = new Map(); // Stores words during recording
let finalTranscription = '';  // Final transcription to display
let speakerPillColors = {};  // Speaker identification logic (we will bypass if DIARIZE_ENABLED is false)
let typingActive = false;     // Typing mode state

// Function to start recording and initialize WebSocket connection
function startRecording() {
    // WebSocket connection for Deepgram transcription
    const socket = new WebSocket('wss://api.deepgram.com/v1/listen?access_token=YOUR_API_KEY');
    
    socket.onopen = () => {
        console.log('WebSocket connection established');
    };
    
    socket.onmessage = (event) => {
        // Parse the incoming message from Deepgram
        const message = JSON.parse(event.data);
        
        // Handle transcription and final message
        if (message.is_final) {
            handleFinalTranscript(message);
        } else {
            handleInterimTranscript(message);
        }
    };
    
    socket.onerror = (error) => {
        console.error('WebSocket error: ', error);
    };
}

// Handle interim transcription messages (streamed real-time text)
function handleInterimTranscript(message) {
    const words = message.channel.alternatives[0].words;
    // Update ephemeral words with no speaker labels if diarization is false
    if (!DIARIZE_ENABLED) {
        words.forEach(word => {
            ephemeralWords.set(word.start, word);
        });
    }
    
    // Sync updated text to the mini app window
    syncEphemeralWords();
}

// Handle final transcription results
function handleFinalTranscript(message) {
    const finalText = message.channel.alternatives[0].transcript;
    
    // If diarization is disabled, ensure no speaker labels
    if (!DIARIZE_ENABLED) {
        finalTranscription += finalText + ' ';
    } else {
        // Handle speaker labels if diarization is enabled
        const speaker = message.channel.alternatives[0].speaker;
        finalTranscription += `${speaker}: ${finalText} `;
    }
    
    // Send the final transcription text to the mini app window
    updateMiniApp(finalTranscription);
}

// Sync the current words (ephemeral) to the mini app, bypassing speaker labels
function syncEphemeralWords() {
    let updatedText = '';
    ephemeralWords.forEach(word => {
        // Only append text, no speaker information if diarization is off
        updatedText += word.value + ' ';
    });
    
    updateMiniApp(updatedText);
}

// Function to simulate pasting text into the mini app window (bypass speaker labels)
function pasteText(text) {
    if (typingActive) {
        // Clean text if it's being pasted, ensuring no diarization labels are present
        const cleanText = text.replace(/Speaker \d+: /g, '');
        // Paste clean text into the mini app input field
        simulatePasteAction(cleanText);
    }
}

// Simulate pasting action using Nut.js or equivalent method
function simulatePasteAction(text) {
    // Assuming `nutjs` or an equivalent method is available for clipboard simulation
    require('nutjs').keyboardEvent('ctrl', 'v', text);
}

// Reset the recording session if needed
function onResetClicked() {
    if (recordingActive) {
        // Perform partial reset (clearing text but keeping WebSocket connection active)
        ephemeralWords.clear();
        finalTranscription = '';
        syncEphemeralWords();
    } else {
        // Full reset (clear all data, stop WebSocket)
        ephemeralWords.clear();
        finalTranscription = '';
        syncEphemeralWords();
        // Additional code for stopping the WebSocket
    }
}

// Update the mini app window with the latest text
function updateMiniApp(text) {
    // Logic to communicate with the mini app window
    window.postMessage({ type: 'transcriptionUpdate', text });
}

// Event listener for receiving messages from the mini app (e.g., typing state)
window.addEventListener('message', (event) => {
    if (event.data.type === 'typingModeChanged') {
        typingActive = event.data.typingActive;
    }
});
