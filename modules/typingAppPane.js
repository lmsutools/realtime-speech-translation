(function() {
    // Use the globally available electron
    const ipcRenderer = window.require ? window.require('electron').ipcRenderer : null;
    
    // Get appState from the global window object
    const appState = window.appState;
    
    async function loadTypingAppSettings() {
        const advancedPane = document.getElementById('advanced');
        
        advancedPane.innerHTML = `
            <div class="setting-group">
                <label for="typingAppGlobalShortcut">Global Shortcut:</label>
                <input type="text" id="typingAppGlobalShortcut" placeholder="e.g., CommandOrControl+Shift+T">
                <small>Press the desired key combination and click Set</small>
                <button id="setShortcutButton" class="small-button">Set</button>
            </div>
            <div class="setting-group">
                <label for="typingAppActiveWidth">Typing App Active Width:</label>
                <input type="number" id="typingAppActiveWidth" min="100" max="800" value="400">
            </div>
            <div class="setting-group">
                <label for="typingAppActiveHeight">Typing App Active Height:</label>
                <input type="number" id="typingAppActiveHeight" min="100" max="600" value="200">
            </div>
        `;
        
        const shortcutInput = document.getElementById('typingAppGlobalShortcut');
        const widthInput = document.getElementById('typingAppActiveWidth');
        const heightInput = document.getElementById('typingAppActiveHeight');
        const setShortcutButton = document.getElementById('setShortcutButton');
        
        // Load saved values
        const currentShortcut = await ipcRenderer.invoke('store-get', 'typingAppGlobalShortcut', 'CommandOrControl+Shift+T');
        const activeWidth = await ipcRenderer.invoke('store-get', 'typingAppActiveWidth', 400);
        const activeHeight = await ipcRenderer.invoke('store-get', 'typingAppActiveHeight', 200);
        
        shortcutInput.value = currentShortcut;
        widthInput.value = activeWidth;
        heightInput.value = activeHeight;
        
        // Initialize keypress listener for shortcut input
        let pressedKeys = [];
        let lastKeyTimeout;
        
        shortcutInput.addEventListener('keydown', (event) => {
            event.preventDefault();
            
            // Clear the timeout to reset the counter
            if (lastKeyTimeout) {
                clearTimeout(lastKeyTimeout);
            }
            
            // Get the key that was pressed
            const key = event.key;
            
            // Skip if it's a modifier key we already have
            if (
                (key === 'Control' && pressedKeys.includes('Control')) ||
                (key === 'Shift' && pressedKeys.includes('Shift')) ||
                (key === 'Alt' && pressedKeys.includes('Alt')) ||
                (key === 'Meta' && pressedKeys.includes('Meta'))
            ) {
                return;
            }
            
            // Add modifiers first
            if (event.ctrlKey && !pressedKeys.includes('Control')) {
                pressedKeys.push('Control');
            }
            if (event.shiftKey && !pressedKeys.includes('Shift')) {
                pressedKeys.push('Shift');
            }
            if (event.altKey && !pressedKeys.includes('Alt')) {
                pressedKeys.push('Alt');
            }
            if (event.metaKey && !pressedKeys.includes('Meta')) {
                pressedKeys.push('Meta');
            }
            
            // Add the main key if it's not a modifier
            if (
                key !== 'Control' && 
                key !== 'Shift' && 
                key !== 'Alt' && 
                key !== 'Meta' && 
                !pressedKeys.includes(key)
            ) {
                pressedKeys.push(key);
            }
            
            // Format the shortcut string
            let shortcutString = '';
            
            if (pressedKeys.includes('Control')) {
                shortcutString += process.platform === 'darwin' ? 'Command+' : 'Control+';
            }
            if (pressedKeys.includes('Meta') && process.platform !== 'darwin') {
                shortcutString += 'Super+';
            }
            if (pressedKeys.includes('Alt')) {
                shortcutString += process.platform === 'darwin' ? 'Option+' : 'Alt+';
            }
            if (pressedKeys.includes('Shift')) {
                shortcutString += 'Shift+';
            }
            
            // Add the main key
            const mainKey = pressedKeys.find(k => 
                k !== 'Control' && k !== 'Shift' && k !== 'Alt' && k !== 'Meta'
            );
            
            if (mainKey) {
                shortcutString += mainKey.length === 1 ? mainKey.toUpperCase() : mainKey;
            }
            
            shortcutInput.value = shortcutString;
            
            // Reset after a small timeout
            lastKeyTimeout = setTimeout(() => {
                pressedKeys = [];
            }, 1500);
        });
        
        // Button to set the shortcut
        setShortcutButton.addEventListener('click', async () => {
            const newShortcut = shortcutInput.value;
            if (newShortcut) {
                await ipcRenderer.invoke('store-set', 'typingAppGlobalShortcut', newShortcut);
                ipcRenderer.send('update-global-shortcut', newShortcut);
            }
        });
        
        // Save dimensions when changed
        widthInput.addEventListener('change', async () => {
            const newWidth = parseInt(widthInput.value);
            if (newWidth >= 100 && newWidth <= 800) {
                await ipcRenderer.invoke('store-set', 'typingAppActiveWidth', newWidth);
            }
        });
        
        heightInput.addEventListener('change', async () => {
            const newHeight = parseInt(heightInput.value);
            if (newHeight >= 100 && newHeight <= 600) {
                await ipcRenderer.invoke('store-set', 'typingAppActiveHeight', newHeight);
            }
        });
    }
    
    document.addEventListener('DOMContentLoaded', async () => {
        // Initialize the typing app settings pane
        await loadTypingAppSettings();
    });
    
    // Export functions for external use
    window.typingAppPane = {
        loadTypingAppSettings
    };
})();