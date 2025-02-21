import { ipcRenderer } from 'electron';
import { getStoreValue, setStoreValue } from '../storeBridge.js';

let lastValidShortcut = 'CommandOrControl+Shift+T';
let isCapturing = false;

document.addEventListener('DOMContentLoaded', () => {
    const typingAppPane = document.getElementById('typingApp');
    if (!typingAppPane) return;

    typingAppPane.innerHTML = `
        <h2>Typing App Settings</h2>
        <div class="setting-group">
            <label for="typingAppShortcut">Global Shortcut for Start/Stop:</label>
            <input type="text" id="typingAppShortcut" placeholder="Click here, then press desired combo" readonly>
        </div>
        <p id="typingAppShortcutHint" style="color: gray; font-style: italic; display: none;">Press the desired key combination, or ESC to cancel.</p>
        <div class="setting-group">
            <label for="typingAppActiveWidth">Active Width (px):</label>
            <input type="number" id="typingAppActiveWidth" min="200" max="800" value="400">
        </div>
        <div class="setting-group">
            <label for="typingAppActiveHeight">Active Height (px):</label>
            <input type="number" id="typingAppActiveHeight" min="100" max="600" value="200">
        </div>
    `;

    const shortcutInput = document.getElementById('typingAppShortcut');
    const hint = document.getElementById('typingAppShortcutHint');
    const widthInput = document.getElementById('typingAppActiveWidth');
    const heightInput = document.getElementById('typingAppActiveHeight');

    getStoreValue('typingAppGlobalShortcut', lastValidShortcut).then((value) => {
        lastValidShortcut = value;
        shortcutInput.value = value;
    });
    getStoreValue('typingAppActiveWidth', 400).then((value) => widthInput.value = value);
    getStoreValue('typingAppActiveHeight', 200).then((value) => heightInput.value = value);

    function buildShortcutString(e) {
        const keys = [];
        const isMac = process.platform === 'darwin';
        if (e.ctrlKey && !isMac) keys.push('Ctrl');
        if (e.metaKey && isMac) keys.push('Command');
        if (e.altKey) keys.push('Alt');
        if (e.shiftKey) keys.push('Shift');
        if (e.key === 'Escape') return null;
        if (e.key === 'Control' || e.key === 'Shift' || e.key === 'Alt' || e.key === 'Meta') return null;
        let mainKey = e.key;
        if (mainKey.length === 1) mainKey = mainKey.toUpperCase();
        if (mainKey === ' ') mainKey = 'Space';
        keys.push(mainKey);
        return keys.join('+');
    }

    function startCapture() {
        if (isCapturing) return;
        isCapturing = true;
        hint.style.display = 'block';
        shortcutInput.value = '';
        document.addEventListener('keydown', handleKeydown);
    }

    function stopCapture() {
        if (!isCapturing) return;
        isCapturing = false;
        hint.style.display = 'none';
        document.removeEventListener('keydown', handleKeydown);
    }

    function handleKeydown(e) {
        e.preventDefault();
        e.stopPropagation();
        if (e.key === 'Escape') {
            stopCapture();
            shortcutInput.value = lastValidShortcut;
            return;
        }
        const combo = buildShortcutString(e);
        if (!combo) return;
        stopCapture();
        shortcutInput.value = combo;
        lastValidShortcut = combo;
        setStoreValue('typingAppGlobalShortcut', combo);
        ipcRenderer.send('update-global-shortcut', combo);
    }

    shortcutInput.addEventListener('focus', startCapture);
    shortcutInput.addEventListener('click', () => {
        shortcutInput.focus();
        startCapture();
    });

    widthInput.addEventListener('change', () => setStoreValue('typingAppActiveWidth', parseInt(widthInput.value)));
    heightInput.addEventListener('change', () => setStoreValue('typingAppActiveHeight', parseInt(heightInput.value)));
});
