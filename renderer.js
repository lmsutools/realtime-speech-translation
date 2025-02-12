import {
    initializeUI,
    updateSourceLanguageDropdown
} from './modules/ui.js';
import {
    startRecording,
    stopRecording
} from './modules/recording.js';
import {
    ipcRenderer
} from 'electron';

// --- Error Logging State ---
let isCapturingErrors = false; // Flag to control error capture
const originalConsoleError = console.error; // Keep the original

function setupErrorCapture() {
    console.error = function(...args) {
        if (isCapturingErrors) { // Only capture if enabled
            const errorLogsDiv = document.getElementById('error-logs');
            if (errorLogsDiv) {
                const errorParagraph = document.createElement('p');
                let message = '';
                for (const arg of args) {
                    if (arg instanceof ErrorEvent) {
                        message += `WebSocket error: ${arg.message} (File: ${arg.filename}, Line: ${arg.lineno})\n`;
                    } else if (arg instanceof CloseEvent) {
                        message += `WebSocket closed: code=${arg.code}, reason=${arg.reason}, wasClean=${arg.wasClean}\n`;
                    } else if (arg instanceof Error) {
                        message += `${arg.message} (File: ${arg.fileName}, Line: ${arg.lineNumber})\n`;
                    }
                    else if (typeof arg === 'object') {
                        try {
                            message += JSON.stringify(arg, null, 2) + '\n';
                        } catch (e) {
                            message += String(arg) + '\n';
                        }
                    } else {
                        message += arg + ' ';
                    }
                }

                errorParagraph.textContent = message;
                errorLogsDiv.appendChild(errorParagraph);
            }
        }
        originalConsoleError.apply(console, args); // Always call original
    };
}

initializeUI();
// Start capturing errors *after* UI is initialized:
isCapturingErrors = true;
setupErrorCapture();

document.getElementById('start').addEventListener('click', startRecording);
document.getElementById('stop').addEventListener('click', stopRecording);
document.getElementById('reset').addEventListener('click', () => {
    document.getElementById('source-text').textContent = '';
    document.getElementById('translated-text').textContent = '';

    // Clear error logs AND stop capturing errors temporarily:
    const errorLogsDiv = document.getElementById('error-logs');
    if (errorLogsDiv) {
        errorLogsDiv.innerHTML = '';
    }
    isCapturingErrors = false; // Disable capture

    // Re-enable error capture *after* a short delay.
    setTimeout(() => {
        isCapturingErrors = true; // Re-enable capture
    }, 0);
});

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
ipcRenderer.on('update-source-languages', (event, selectedModel) => {
    updateSourceLanguageDropdown(selectedModel);
});
