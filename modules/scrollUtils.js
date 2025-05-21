/**
 * Utility functions for handling auto-scroll functionality
 * in the source and translated panes
 */

// Throttle function to limit the number of times a function can be called
function throttle(callback, delay) {
    let isThrottled = false;
    let savedArgs = null;
    let savedThis = null;
    
    function wrapper() {
        if (isThrottled) {
            savedArgs = arguments;
            savedThis = this;
            return;
        }
        
        isThrottled = true;
        callback.apply(this, arguments);
        
        setTimeout(function() {
            isThrottled = false;
            if (savedArgs) {
                wrapper.apply(savedThis, savedArgs);
                savedArgs = savedThis = null;
            }
        }, delay);
    }
    
    return wrapper;
}

// Function to scroll a pane to the bottom
function scrollPaneToBottom(paneSelector) {
    const paneContent = document.querySelector(paneSelector + ' .pane-content');
    if (!paneContent) return;
    
    // Add visual feedback that scrolling is happening
    paneContent.classList.add('scrolling-now');
    
    // Smooth scroll to bottom
    paneContent.scrollTop = paneContent.scrollHeight;
    
    // Remove the visual feedback after animation completes
    setTimeout(() => {
        paneContent.classList.remove('scrolling-now');
    }, 1000);
}

// Throttled version of scrollPaneToBottom to prevent too many calls
const throttledScrollToBottom = throttle(scrollPaneToBottom, 100);

// Function to check if auto-scroll is enabled for a pane
function isAutoScrollEnabled(paneType) {
    if (paneType === 'source') {
        return window.sourceAutoScrollEnabled === true;
    } else if (paneType === 'translated') {
        return window.translatedAutoScrollEnabled === true;
    }
    return false;
}

// Function to toggle auto-scroll for a pane
function toggleAutoScroll(paneType) {
    if (paneType === 'source') {
        window.sourceAutoScrollEnabled = !window.sourceAutoScrollEnabled;
        updateAutoScrollUI('source', window.sourceAutoScrollEnabled);
        // Save preference
        if (window.require) {
            const ipcRenderer = window.require('electron').ipcRenderer;
            ipcRenderer.invoke('store-set', 'sourceAutoScrollEnabled', window.sourceAutoScrollEnabled);
        }
    } else if (paneType === 'translated') {
        window.translatedAutoScrollEnabled = !window.translatedAutoScrollEnabled;
        updateAutoScrollUI('translated', window.translatedAutoScrollEnabled);
        // Save preference
        if (window.require) {
            const ipcRenderer = window.require('electron').ipcRenderer;
            ipcRenderer.invoke('store-set', 'translatedAutoScrollEnabled', window.translatedAutoScrollEnabled);
        }
    }
}

// Update UI to reflect auto-scroll state
function updateAutoScrollUI(paneType, isEnabled) {
    const toggle = document.querySelector(`.auto-scroll-toggle[data-pane="${paneType}"]`);
    const pane = document.querySelector(`.${paneType}-pane`);
    
    if (toggle) {
        toggle.textContent = isEnabled ? 'Auto-Scroll On' : 'Auto-Scroll Off';
        toggle.classList.toggle('enabled', isEnabled);
        toggle.classList.toggle('disabled', !isEnabled);
    }
    
    if (pane) {
        pane.classList.toggle('auto-scroll-active', isEnabled);
    }
}

// Initialize auto-scroll functionality
function initAutoScroll() {
    const sourceToggle = document.querySelector('.auto-scroll-toggle[data-pane="source"]');
    const translatedToggle = document.querySelector('.auto-scroll-toggle[data-pane="translated"]');
    
    // Set initial auto-scroll states from window globals or defaults
    window.sourceAutoScrollEnabled = window.sourceAutoScrollEnabled !== undefined ? window.sourceAutoScrollEnabled : true;
    window.translatedAutoScrollEnabled = window.translatedAutoScrollEnabled !== undefined ? window.translatedAutoScrollEnabled : true;
    
    // Load saved preferences if available
    if (window.require) {
        const ipcRenderer = window.require('electron').ipcRenderer;
        
        // Load source auto-scroll preference
        ipcRenderer.invoke('store-get', 'sourceAutoScrollEnabled', true)
            .then(value => {
                window.sourceAutoScrollEnabled = value;
                updateAutoScrollUI('source', window.sourceAutoScrollEnabled);
            })
            .catch(err => {
                console.error('Error loading source auto-scroll preference:', err);
            });
        
        // Load translated auto-scroll preference
        ipcRenderer.invoke('store-get', 'translatedAutoScrollEnabled', true)
            .then(value => {
                window.translatedAutoScrollEnabled = value;
                updateAutoScrollUI('translated', window.translatedAutoScrollEnabled);
            })
            .catch(err => {
                console.error('Error loading translated auto-scroll preference:', err);
            });
    } else {
        // Update UI with default values
        updateAutoScrollUI('source', window.sourceAutoScrollEnabled);
        updateAutoScrollUI('translated', window.translatedAutoScrollEnabled);
    }
    
    // Add event listeners to toggles
    if (sourceToggle) {
        sourceToggle.addEventListener('click', () => toggleAutoScroll('source'));
    }
    
    if (translatedToggle) {
        translatedToggle.addEventListener('click', () => toggleAutoScroll('translated'));
    }
    
    // Add observer to auto-scroll when content changes
    const sourceContent = document.getElementById('source-text');
    const translatedContent = document.getElementById('translated-text');
    
    if (sourceContent) {
        const sourceObserver = new MutationObserver(() => {
            if (window.sourceAutoScrollEnabled) {
                throttledScrollToBottom('.source-pane');
            }
        });
        
        sourceObserver.observe(sourceContent, {
            childList: true,
            characterData: true,
            subtree: true
        });
    }
    
    if (translatedContent) {
        const translatedObserver = new MutationObserver(() => {
            if (window.translatedAutoScrollEnabled) {
                throttledScrollToBottom('.translated-pane');
            }
        });
        
        translatedObserver.observe(translatedContent, {
            childList: true,
            characterData: true,
            subtree: true
        });
    }
}

// Export all functions
export {
    scrollPaneToBottom,
    throttledScrollToBottom,
    isAutoScrollEnabled,
    toggleAutoScroll,
    updateAutoScrollUI,
    initAutoScroll
};

// Initialize immediately if document is already ready
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    initAutoScroll();
} else {
    document.addEventListener('DOMContentLoaded', initAutoScroll);
}

// Make functions available globally
window.scrollUtils = {
    scrollPaneToBottom,
    throttledScrollToBottom,
    isAutoScrollEnabled,
    toggleAutoScroll,
    updateAutoScrollUI,
    initAutoScroll
};