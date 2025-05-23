(function() {
// Use the globally available electron
const ipcRenderer = window.require ? window.require('electron').ipcRenderer : null;

// Get appState from the global window object
const appState = window.appState;

// Utility function to scroll to the bottom of an element
function scrollToBottom(element) {
    if (element) {
        element.scrollTop = element.scrollHeight;
    }
}

async function testTranslation() {
    const translatedTextElement = document.getElementById('translated-text');
    if (!translatedTextElement) return;

    translatedTextElement.innerHTML += '<div class="translation-status">Testing translation...</div>';

    try {
        // Direct import of the translateWithAI function
        const importPromise = import('../translation.js').then(module => {
            if (module && typeof module.translateWithAI === 'function') {
                return module.translateWithAI("This is a test message.", "", "");
            } else {
                throw new Error("Translation function not found");
            }
        }).catch(err => {
            console.error("Could not import translation module:", err);
            // Fallback: try to use window.translateWithAI if available
            if (window.translateWithAI && typeof window.translateWithAI === 'function') {
                return window.translateWithAI("This is a test message.", "", "");
            } else {
                throw new Error("Translation module not available");
            }
        });

        const result = await importPromise;

        if (result.startsWith("Translation Error:")) {
            translatedTextElement.innerHTML += `<div class="error-message">${result}</div>`;
        } else {
            translatedTextElement.innerHTML += `<div>Test translation: "${result}"</div>`;
            // Auto-scroll to the bottom after adding content
            scrollToBottom(translatedTextElement);
        }
    } catch (error) {
        console.error("Test translation error:", error);
        translatedTextElement.innerHTML += `<div class="error-message">Test error: ${error.message || "Unknown error"}</div>`;
    }
}

// Export functions globally
window.testingUtils = {
    testTranslation
};

})();
