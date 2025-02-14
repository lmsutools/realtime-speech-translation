const { ipcRenderer } = require('electron');

// When the window is about to close, notify the main process if needed
window.onbeforeunload = () => {
  // Cleanup if necessary
};

// Listen for transcription updates and auto-scroll to the bottom
ipcRenderer.on('typing-app-update-text', (event, fullText) => {
  const typingAppText = document.getElementById('typingAppText');
  const textContainer = document.getElementById('typingAppTextContainer');
  typingAppText.textContent = fullText;
  textContainer.scrollTop = textContainer.scrollHeight;
});

// Listen for recording state changes to update the recording indicator color
ipcRenderer.on('typing-app-recording-state', (event, isRecording) => {
  const indicator = document.getElementById('recordingIndicator');
  indicator.style.backgroundColor = isRecording ? 'green' : 'red';
});

// Toggle transcription on click of the recording indicator
document.getElementById('recordingIndicator').addEventListener('click', () => {
  ipcRenderer.send('global-toggle-recording');
});
