(function() {
    // Use the electronAPI from preload
    const electronAPI = window.electronAPI;
    
    // Get appState from the global window object
    const appState = window.appState;
    
    function updateTranslationUI(enableTranslation) {
        // Make sure the DOM is ready before accessing elements
        const translatedPane = document.querySelector('.translated-pane');
        if (!translatedPane) {
            console.warn('Translation pane not found in DOM');
            return;
        }
        
        const targetLanguageSelect = document.getElementById('targetLanguage');
        const mainContent = document.querySelector('.main-content');
        const arrowSpan = document.querySelector('.arrow');
        
        if (enableTranslation) {
            translatedPane.classList.add('visible');
            if (targetLanguageSelect) targetLanguageSelect.style.display = 'block';
            if (arrowSpan) arrowSpan.style.display = 'block';
            if (mainContent) {
                mainContent.classList.add('translation-enabled');
            }
            
            // Add a test button if it doesn't exist
            addTestButton();
        } else {
            translatedPane.classList.remove('visible');
            if (targetLanguageSelect) targetLanguageSelect.style.display = 'none';
            if (arrowSpan) arrowSpan.style.display = 'none';
            if (mainContent) {
                mainContent.classList.remove('translation-enabled');
            }
        }
    }
    
    // Add a test button to the translation pane
    function addTestButton() {
        if (document.getElementById('testTranslation')) {
            return; // Button already exists
        }
        
        const translationHeader = document.querySelector('.translation-header .pane-controls');
        if (!translationHeader) return;
        
        const testButton = document.createElement('button');
        testButton.id = 'testTranslation';
        testButton.className = 'small-button';
        testButton.textContent = 'Test';
        testButton.title = 'Test translation';
        testButton.style.fontSize = '12px';
        testButton.style.padding = '4px 12px';
        
        testButton.addEventListener('click', async () => {
            if (window.testingUtils) {
                await window.testingUtils.testTranslation();
            }
        });
        
        translationHeader.appendChild(testButton);
    }
    
    // Export functions globally
    window.translationUI = {
        updateTranslationUI,
        addTestButton
    };
})();
