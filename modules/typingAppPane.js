import { ipcRenderer } from 'electron';
import { appState } from '../stores/appState.js';

let lastValidShortcut = "CommandOrControl+Shift+T";
let isCapturing = false;

export async function loadTypingAppSettings() {
  const advancedPane = document.getElementById('advanced');
  advancedPane.innerHTML = `
    <h3>Typing App</h3>
    <div class="setting-group">
      <label for="typingAppShortcut">Global Shortcut:</label>
      <input type="text" id="typingAppShortcut" placeholder="Click here, then press desired combo" readonly>
      <p id="typingAppShortcutHint" style="color: gray; font-style: italic; display: none;">Press the desired key combination, or ESC to cancel.</p>
    </div>
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

  lastValidShortcut = appState.typingAppGlobalShortcut;
  shortcutInput.value = lastValidShortcut;
  widthInput.value = appState.typingAppActiveWidth;
  heightInput.value = appState.typingAppActiveHeight;

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
    ipcRenderer.send('unregister-global-shortcut');
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
      ipcRenderer.send('update-global-shortcut', lastValidShortcut);
      return;
    }
    const combo = buildShortcutString(e);
    if (!combo) return;
    stopCapture();
    shortcutInput.value = combo;
    lastValidShortcut = combo;
    appState.setTypingAppGlobalShortcut(combo);
    ipcRenderer.send('update-global-shortcut', combo);
  }

  shortcutInput.addEventListener('focus', startCapture);
  shortcutInput.addEventListener('click', () => {
    shortcutInput.focus();
    startCapture();
  });

  widthInput.addEventListener('change', () => {
    const newWidth = parseInt(widthInput.value);
    appState.setTypingAppActiveWidth(newWidth);
    ipcRenderer.invoke('store-set', 'typingAppActiveWidth', newWidth);
  });

  heightInput.addEventListener('change', () => {
    const newHeight = parseInt(heightInput.value);
    appState.setTypingAppActiveHeight(newHeight);
    ipcRenderer.invoke('store-set', 'typingAppActiveHeight', newHeight);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  loadTypingAppSettings();
});
