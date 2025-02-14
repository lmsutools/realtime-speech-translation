const { ipcRenderer } = require('electron');

// When the window is about to close, we notify the main process if needed
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

// -------------------------------------------------------
// Toggle for typing/pasting mechanism
// -------------------------------------------------------
let typingActive = false; // default inactive
const typingToggleIcon = document.getElementById('typingToggleIcon');
const ACTIVE_ICON_PATH = '../../assets/icons/typing-active.png';
const INACTIVE_ICON_PATH = '../../assets/icons/typing-inactive.png';

function updateTypingIcon() {
  typingToggleIcon.src = typingActive ? ACTIVE_ICON_PATH : INACTIVE_ICON_PATH;
}

// On click, toggle the state and inform the rest of the app
typingToggleIcon.addEventListener('click', () => {
  typingActive = !typingActive;
  updateTypingIcon();
  ipcRenderer.send('typing-app-typing-mode-changed', typingActive);
});

// Initialize the icon on load
updateTypingIcon();

// -------------------------------------------------------
// NEW: Add click event for the recording indicator to toggle transcription
// -------------------------------------------------------
const recordingIndicator = document.getElementById('recordingIndicator');
recordingIndicator.addEventListener('click', () => {
  ipcRenderer.send('global-toggle-recording');
});
