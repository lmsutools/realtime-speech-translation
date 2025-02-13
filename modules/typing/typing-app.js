const { ipcRenderer } = require('electron');

// When the window is about to close, we notify the main process
window.onbeforeunload = () => {
  // This triggers the main process to restore the main window and stop recording
  // The 'closed' event in main.js calls mainWindow.webContents.send('typing-app-window-closed')
  // so that the renderer can run stopRecording().
};

// Listen for transcription updates
ipcRenderer.on('typing-app-update-text', (event, fullText) => {
  const typingAppText = document.getElementById('typingAppText');
  typingAppText.textContent = fullText;
});

// Listen for recording state changes
ipcRenderer.on('typing-app-recording-state', (event, isRecording) => {
  const indicator = document.getElementById('recordingIndicator');
  indicator.style.backgroundColor = isRecording ? 'green' : 'red';
});
