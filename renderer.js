import dotenv from 'dotenv';
dotenv.config();
import { initializeUI, updateSourceLanguageDropdown } from './modules/ui.js'; // Import the new function
import { startRecording, stopRecording } from './modules/recording.js';
import { ipcRenderer } from 'electron';

initializeUI();

document.getElementById('start').addEventListener('click', startRecording);
document.getElementById('stop').addEventListener('click', stopRecording);
document.getElementById('typingAppButton').addEventListener('click', () => {
    console.log('Typing App button clicked');
});

document.getElementById('settingsIcon').addEventListener('click', () => {
    ipcRenderer.send('open-settings');
});

ipcRenderer.on('update-translation-ui', (event, enableTranslation) => {
    import('./modules/ui.js').then(ui => {
        ui.updateTranslationUI(enableTranslation);
    });
});

// Listen for source language updates from main process
ipcRenderer.on('update-source-languages', (event, selectedModel) => {
    updateSourceLanguageDropdown(selectedModel); // Call directly, already imported
});
