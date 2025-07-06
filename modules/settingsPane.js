(function() {
    const ipcRenderer = window.require ? window.require('electron').ipcRenderer : null;

    async function populateInputDevices(selectId) {
        const select = document.getElementById(selectId);
        if (!select) return;
        select.innerHTML = '<option value="">Default Microphone</option>';
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const audioInputs = devices.filter(device => device.kind === 'audioinput');
            const savedDeviceId = await ipcRenderer.invoke('store-get', 'defaultInputDevice', '');
            audioInputs.forEach(device => {
                const option = document.createElement('option');
                option.value = device.deviceId;
                option.text = device.label || `Microphone ${select.options.length}`;
                if (savedDeviceId && device.deviceId === savedDeviceId) {
                    option.selected = true;
                }
                select.appendChild(option);
            });
        } catch (error) { console.error('Error getting input devices:', error); }
    }

    async function loadSettings() {
        const generalPane = document.getElementById('general');
        generalPane.innerHTML = `<div class="setting-group"><label for="inputDeviceSettings">Input Device:</label><select id="inputDeviceSettings"></select></div><div class="setting-group"><label for="autoStopTimer">Auto-Stop Timer (minutes):</label><input type="number" id="autoStopTimer" min="1" value="60"></div>`;
        
        await populateInputDevices('inputDeviceSettings');

        const inputDeviceSettingsSelect = document.getElementById('inputDeviceSettings');
        const autoStopTimerInput = document.getElementById('autoStopTimer');
        
        autoStopTimerInput.value = await ipcRenderer.invoke('store-get', 'autoStopTimer', 60);

        // --- AUTO-SAVE ---
        inputDeviceSettingsSelect.addEventListener('change', (event) => {
            ipcRenderer.invoke('store-set', 'defaultInputDevice', event.target.value);
        });
        
        const debouncedSaveTimer = debounce((value) => {
            ipcRenderer.invoke('store-set', 'autoStopTimer', value);
        }, 400);

        autoStopTimerInput.addEventListener('input', (event) => {
            debouncedSaveTimer(event.target.value);
        });
    }
    
    function debounce(func, wait) { let timeout; return function (...args) { clearTimeout(timeout); timeout = setTimeout(() => func.apply(this, args), wait); }; }
    
    document.addEventListener('DOMContentLoaded', async () => {
        await loadSettings();
        // ... (tab switching and close button logic remains the same)
        const tabButtons = document.querySelectorAll('.tab-button');
        const tabPanes = document.querySelectorAll('.tab-pane');
        tabButtons.forEach(button => { button.addEventListener('click', () => { tabButtons.forEach(btn => btn.classList.remove('active')); tabPanes.forEach(pane => pane.classList.remove('active')); button.classList.add('active'); const tabId = button.dataset.tab; const targetPane = document.getElementById(tabId); if (targetPane) { targetPane.classList.add('active'); } else { console.error(`Tab pane with ID '${tabId}' not found`); } }); });
        document.querySelector('.close-settings').addEventListener('click', () => { document.querySelector('.settings-panel').classList.remove('visible'); });
    });
})();
