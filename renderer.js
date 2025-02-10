import dotenv from 'dotenv';
dotenv.config();
import { initializeUI } from './modules/ui.js';
import { startRecording, stopRecording } from './modules/recording.js';
import { ipcRenderer } from 'electron';

initializeUI();

document.getElementById('start').addEventListener('click', startRecording);
document.getElementById('stop').addEventListener('click', stopRecording);
document.getElementById('typingAppButton').addEventListener('click', () => {
    // You can add specific logic for the Typing App button here if needed.
    // The existing pasteText function in utils.js handles the core typing.
    console.log('Typing App button clicked');
});

document.getElementById('settingsIcon').addEventListener('click', () => {
    ipcRenderer.send('open-settings');
});
