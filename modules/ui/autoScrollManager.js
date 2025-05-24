(function() {
    // Use the electronAPI from preload
    const electronAPI = window.electronAPI;
    
    // Define auto-scroll states
    window.sourceAutoScrollEnabled = true;
    window.translatedAutoScrollEnabled = true;
    
    // Utility functions for store operations
    async function getStoreValue(key, defaultValue) {
        if (electronAPI) {
            return electronAPI.invoke('store-get', key, defaultValue);
        }
        return defaultValue;
    }
    
    async function setStoreValue(key, value) {
        if (electronAPI) {
            return electronAPI.invoke('store-set', key, value);
        }
        return false;
    }
    
    // Utility function to scroll to the bottom of an element
    function scrollToBottom(element) {
        if (element) {
            element.scrollTop = element.scrollHeight;
        }
    }
    
    function initializeAutoScroll() {
        const sourceToggle = document.querySelector('.auto-scroll-toggle[data-pane="source"]');
        const translatedToggle = document.querySelector('.auto-scroll-toggle[data-pane="translated"]');
        
        if (sourceToggle) {
            sourceToggle.classList.add('enabled');
            sourceToggle.textContent = 'Auto-Scroll On';
            
            sourceToggle.addEventListener('click', () => {
                window.sourceAutoScrollEnabled = !window.sourceAutoScrollEnabled;
                sourceToggle.textContent = window.sourceAutoScrollEnabled ? 'Auto-Scroll On' : 'Auto-Scroll Off';
                sourceToggle.classList.toggle('enabled', window.sourceAutoScrollEnabled);
                sourceToggle.classList.toggle('disabled', !window.sourceAutoScrollEnabled);
                
                // Save preference to store
                setStoreValue('sourceAutoScrollEnabled', window.sourceAutoScrollEnabled);
            });
        }
        
        if (translatedToggle) {
            translatedToggle.classList.add('enabled');
            translatedToggle.textContent = 'Auto-Scroll On';
            
            translatedToggle.addEventListener('click', () => {
                window.translatedAutoScrollEnabled = !window.translatedAutoScrollEnabled;
                translatedToggle.textContent = window.translatedAutoScrollEnabled ? 'Auto-Scroll On' : 'Auto-Scroll Off';
                translatedToggle.classList.toggle('enabled', window.translatedAutoScrollEnabled);
                translatedToggle.classList.toggle('disabled', !window.translatedAutoScrollEnabled);
                
                // Save preference to store
                setStoreValue('translatedAutoScrollEnabled', window.translatedAutoScrollEnabled);
            });
        }
        
        // Load saved auto-scroll preferences
        getStoreValue('sourceAutoScrollEnabled', true).then(value => {
            window.sourceAutoScrollEnabled = value;
            if (sourceToggle) {
                sourceToggle.textContent = window.sourceAutoScrollEnabled ? 'Auto-Scroll On' : 'Auto-Scroll Off';
                sourceToggle.classList.toggle('enabled', window.sourceAutoScrollEnabled);
                sourceToggle.classList.toggle('disabled', !window.sourceAutoScrollEnabled);
            }
        });
        
        getStoreValue('translatedAutoScrollEnabled', true).then(value => {
            window.translatedAutoScrollEnabled = value;
            if (translatedToggle) {
                translatedToggle.textContent = window.translatedAutoScrollEnabled ? 'Auto-Scroll On' : 'Auto-Scroll Off';
                translatedToggle.classList.toggle('enabled', window.translatedAutoScrollEnabled);
                translatedToggle.classList.toggle('disabled', !window.translatedAutoScrollEnabled);
            }
        });
    }
    
    // Export functions globally
    window.autoScrollManager = {
        initializeAutoScroll,
        scrollToBottom
    };
})();
