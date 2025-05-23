import { scrollPaneToBottom } from '../scrollUtils.js';

export class UIUpdater {
    static updateSourceText(content, preservedContent = "") {
        const sourceElement = document.getElementById('source-text');
        if (sourceElement) {
            sourceElement.innerHTML = (preservedContent ? preservedContent + '<br>' : '') + content;
            
            if (window.sourceAutoScrollEnabled) {
                scrollPaneToBottom('.source-pane');
            }
        }
    }

    static updateTranslatedText(content, isAppend = false) {
        const translatedElement = document.getElementById('translated-text');
        if (translatedElement) {
            if (isAppend) {
                translatedElement.textContent += " " + content;
            } else {
                translatedElement.innerHTML = content;
            }
            
            if (window.translatedAutoScrollEnabled) {
                scrollPaneToBottom('.translated-pane');
            }
        }
    }

    static clearTexts() {
        const sourceElement = document.getElementById('source-text');
        const translatedElement = document.getElementById('translated-text');
        
        if (sourceElement) sourceElement.textContent = '';
        if (translatedElement) translatedElement.textContent = '';
    }

    static scrollPaneToTop(paneSelector) {
        const paneContent = document.querySelector(paneSelector + ' .pane-content');
        if (paneContent) {
            paneContent.scrollTop = 0;
        }
    }

    static updateTranslationStatus(message, isError = false) {
        const translatedText = document.getElementById('translated-text');
        if (!translatedText) return;

        if (isError) {
            translatedText.innerHTML += `<span class="error-message">${message}</span><br>`;
        } else {
            const statusElem = document.createElement('div');
            statusElem.className = 'translation-status';
            statusElem.textContent = message;
            translatedText.appendChild(statusElem);
            
            setTimeout(() => {
                if (statusElem.parentNode === translatedText) {
                    translatedText.removeChild(statusElem);
                }
            }, 3000);
        }
    }

    static updateButtons(isRecording) {
        const startBtn = document.getElementById('start');
        const stopBtn = document.getElementById('stop');
        
        if (startBtn && stopBtn) {
            startBtn.style.display = isRecording ? 'none' : 'block';
            stopBtn.style.display = isRecording ? 'block' : 'none';
        }
    }
}
