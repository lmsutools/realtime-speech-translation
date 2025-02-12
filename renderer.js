import { initializeUI, updateSourceLanguageDropdown } from './modules/ui.js';
import { startRecording, stopRecording } from './modules/recording.js';
import { ipcRenderer } from 'electron';
initializeUI();
document.getElementById('start').addEventListener('click', startRecording);
document.getElementById('stop').addEventListener('click', stopRecording);
document.getElementById('reset').addEventListener('click', () => {
    document.getElementById('source-text').textContent = '';
    document.getElementById('translated-text').textContent = '';
});
document.getElementById('typingAppButton').addEventListener('click', () => {
    console.log('Typing App button clicked');
});
document.getElementById('settingsIcon').addEventListener('click', () => {
    ipcRenderer.send('open-settings');
});
ipcRenderer.on('update-translation-ui', (event, enableTranslation) => {
    import ('./modules/ui.js').then(ui => {
        ui.updateTranslationUI(enableTranslation);
    });
});
ipcRenderer.on('update-source-languages', (event, selectedModel) => {
    updateSourceLanguageDropdown(selectedModel);
});
