(function() {
    // Use the electronAPI from preload
    const electronAPI = window.electronAPI;
    
    // Get appState from the global window object
    const appState = window.appState;
    
    function debounce(func, wait) {
        let timeout;
        return function (...args) {
            const context = this;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), wait);
        };
    }
    
    async function validateDeepgramToken(apiKey) {
        if (!apiKey) return { status: "not_set", message: "Deepgram API key is not set." };
        
        try {
            const response = await fetch("https://api.deepgram.com/v1/auth/token", {
                method: "GET",
                headers: {
                    "Authorization": `Token ${apiKey}`,
                    "Content-Type": "application/json"
                }
            });
            
            if (response.ok) {
                try {
                    const data = await response.json();
                    return { status: "valid" };
                } catch (parseError) {
                    // If we can't parse JSON but got 200, it might still be valid
                    return { status: "valid" };
                }
            }
            
            let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
            try {
                const errorData = await response.json();
                errorMessage = `Invalid Deepgram API Key: ${errorData.err_msg || errorData.message || 'Unknown error'}`;
            } catch (parseError) {
                // If we can't parse the error response, use the status text
                errorMessage = `Invalid Deepgram API Key: HTTP ${response.status}`;
            }
            
            return {
                status: "invalid",
                message: errorMessage
            };
        } catch (error) {
            console.error('Deepgram validation error:', error);
            return {
                status: "invalid",
                message: `Error validating Deepgram API key: ${error.message}`
            };
        }
    }
    
    async function populateInputDevices(selectId) {
        const select = document.getElementById(selectId);
        if (!select) return;
        
        // Clear existing options
        select.innerHTML = '<option value="">Default Microphone</option>';
        
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const audioInputs = devices.filter(device => device.kind === 'audioinput');
            
            audioInputs.forEach(device => {
                const option = document.createElement('option');
                option.value = device.deviceId;
                option.text = device.label || `Microphone ${select.options.length}`;
                select.appendChild(option);
            });
        } catch (error) {
            console.error('Error getting input devices:', error);
        }
    }
    
    async function loadSettings() {
        const generalPane = document.getElementById('general');
        generalPane.innerHTML = `
            <div class="setting-group">
                <label for="inputDeviceSettings">Input Device:</label>
                <select id="inputDeviceSettings"></select>
            </div>
            <div class="setting-group">
                <label for="autoStopTimer">Auto-Stop Timer (minutes):</label>
                <input type="number" id="autoStopTimer" min="1" value="60">
            </div>
        `;
        
        const inputDeviceSettingsSelect = document.getElementById('inputDeviceSettings');
        const autoStopTimerInput = document.getElementById('autoStopTimer');
        
        const defaultInputDevice = await electronAPI.invoke('store-get', 'defaultInputDevice', '');
        await populateInputDevices('inputDeviceSettings');
        if (defaultInputDevice) inputDeviceSettingsSelect.value = defaultInputDevice;
        
        const autoStopTimer = await electronAPI.invoke('store-get', 'autoStopTimer', 60);
        autoStopTimerInput.value = autoStopTimer;
    }
    
    async function saveSettings() {
        const inputDeviceSettingsSelect = document.getElementById('inputDeviceSettings');
        const autoStopTimerInput = document.getElementById('autoStopTimer');
        
        if (inputDeviceSettingsSelect) {
            electronAPI.invoke('store-set', 'defaultInputDevice', inputDeviceSettingsSelect.value);
        }
        if (autoStopTimerInput) {
            electronAPI.invoke('store-set', 'autoStopTimer', autoStopTimerInput.value);
        }
    }
    
    document.addEventListener('DOMContentLoaded', async () => {
        const inputDeviceSettingsSelect = document.getElementById('inputDeviceSettings');
        const autoStopTimerInput = document.getElementById('autoStopTimer');
        
        await loadSettings();
        
        if (inputDeviceSettingsSelect) inputDeviceSettingsSelect.addEventListener('change', saveSettings);
        if (autoStopTimerInput) autoStopTimerInput.addEventListener('change', saveSettings);
        
        const tabButtons = document.querySelectorAll('.tab-button');
        const tabPanes = document.querySelectorAll('.tab-pane');
        
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                tabButtons.forEach(btn => btn.classList.remove('active'));
                tabPanes.forEach(pane => pane.classList.remove('active'));
                
                button.classList.add('active');
                const tabId = button.dataset.tab;
                const targetPane = document.getElementById(tabId);
                if (targetPane) {
                    targetPane.classList.add('active');
                } else {
                    console.error(`Tab pane with ID '${tabId}' not found`);
                }
            });
        });
        
        document.querySelector('.close-settings').addEventListener('click', () => {
            document.querySelector('.settings-panel').classList.remove('visible');
        });
    });
    
    // Export functions for external use
    window.settingsPane = {
        loadSettings,
        saveSettings,
        populateInputDevices,
        validateDeepgramToken
    };
})();
