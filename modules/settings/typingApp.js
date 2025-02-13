const { ipcRenderer } = require('electron');

// We'll keep some references outside event listeners
let lastValidShortcut = 'CommandOrControl+Shift+T'; // default if none saved
let isCapturing = false; // Are we currently capturing keystrokes?

document.addEventListener('DOMContentLoaded', () => {
  const typingAppPane = document.getElementById('typingApp');
  if (!typingAppPane) return;

  // Build the Typing App tab HTML if not already present
  typingAppPane.innerHTML = `
    <h2>Typing App Settings</h2>
    <div class="setting-group">
      <label for="typingAppShortcut">
        Global Shortcut for Start/Stop (click to set):
      </label>
      <input type="text" id="typingAppShortcut" placeholder="Click here, then press desired combo" readonly>
    </div>
    <p id="typingAppShortcutHint" style="color: gray; font-style: italic; display: none;">
      Press the desired key combination, or ESC to cancel.
    </p>
  `;

  // Elements
  const shortcutInput = document.getElementById('typingAppShortcut');
  const hint = document.getElementById('typingAppShortcutHint');

  // Load from localStorage or use default
  lastValidShortcut = localStorage.getItem('typingAppGlobalShortcut') || lastValidShortcut;
  shortcutInput.value = lastValidShortcut;

  // UTILITY: Build a string from the event
  function buildShortcutString(e) {
    const keys = [];

    // Identify if user is on mac or not
    const isMac = process.platform === 'darwin';

    // Modifiers
    if (e.ctrlKey && !isMac) keys.push('Ctrl');
    if (e.metaKey && isMac) keys.push('Command');
    if (e.altKey) keys.push('Alt');
    if (e.shiftKey) keys.push('Shift');

    // The main key
    // e.code might be "KeyA", "F2", "ArrowLeft", etc.
    // e.key might be "a", "F2", "ArrowLeft", etc.
    // We'll handle a few special cases (like space).
    // You could get more advanced if you want.

    // If it's ESC, we won't do finalizing here but handle it separately
    if (e.key === 'Escape') {
      return null;
    }

    // We don't want to finalize on just a modifier
    if (
      e.key === 'Control' ||
      e.key === 'Shift' ||
      e.key === 'Alt' ||
      e.key === 'Meta'
    ) {
      return null; // Wait for a real key
    }

    // For function keys, we can use e.key (e.g., F1, F2)
    // For letters, we want uppercase if shift was pressed, but let's keep it uppercase for clarity
    // e.key could be "a" or "A". We'll unify to uppercase or a normal string
    let mainKey = e.key;
    if (mainKey.length === 1) {
      mainKey = mainKey.toUpperCase();
    }

    // Some keys like " " become "Space"
    if (mainKey === ' ') {
      mainKey = 'Space';
    }

    keys.push(mainKey);

    return keys.join('+');
  }

  function startCapture() {
    if (isCapturing) return;
    isCapturing = true;
    hint.style.display = 'block'; // show instruction
    shortcutInput.value = '';     // clear temp display

    document.addEventListener('keydown', handleKeydown);
  }

  function stopCapture() {
    if (!isCapturing) return;
    isCapturing = false;
    hint.style.display = 'none';
    document.removeEventListener('keydown', handleKeydown);
  }

  function handleKeydown(e) {
    // Prevent text from actually typing in the field
    e.preventDefault();
    e.stopPropagation();

    // If ESC -> cancel
    if (e.key === 'Escape') {
      stopCapture();
      // revert to last known
      shortcutInput.value = lastValidShortcut;
      return;
    }

    // Build combination
    const combo = buildShortcutString(e);
    if (!combo) {
      return; // either a pure modifier or ESC
    }

    // We have a final combination
    stopCapture();
    shortcutInput.value = combo;
    lastValidShortcut = combo;

    // Persist & notify main
    localStorage.setItem('typingAppGlobalShortcut', combo);
    ipcRenderer.send('update-global-shortcut', combo);
  }

  // FOCUS / CLICK -> start capturing
  shortcutInput.addEventListener('focus', startCapture);
  shortcutInput.addEventListener('click', () => {
    // Re-focus to ensure we start capturing
    shortcutInput.focus();
    startCapture();
  });
});
