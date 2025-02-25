const { ipcRenderer } = require('electron');
const { appState } = require('../../stores/appState.js');
const { runInAction } = require("mobx");

const stateMachine = {
  states: {
    Idle: { width: 90, height: 90, textVisible: false },
    Active: { width: 450, height: 250, textVisible: true }
  },
  currentState: 'Idle',
  transitionTo(newState) {
    console.log(`[TypingApp] Transitioning to ${newState}`);
    const container = document.querySelector('.container');
    container.classList.toggle('idle', newState === 'Idle');
    container.classList.toggle('active', newState === 'Active');
    const micContainer = document.querySelector('.mic-container');
    if (newState === 'Idle') {
      if (micContainer) {
        micContainer.style.cursor = 'pointer';
        micContainer.removeEventListener('click', handleMicClick);
        micContainer.addEventListener('click', handleMicClick, { once: false });
        console.log('[TypingApp] Mic click listener reattached in Idle state');
      }
      ipcRenderer.send('typing-app-resize', {
        width: this.states.Idle.width,
        height: this.states.Idle.height
      });
    } else if (newState === 'Active') {
      Promise.all([
        ipcRenderer.invoke('store-get', 'typingAppActiveWidth', this.states.Active.width),
        ipcRenderer.invoke('store-get', 'typingAppActiveHeight', this.states.Active.height)
      ]).then(([width, height]) => {
        ipcRenderer.send('typing-app-resize', { width, height });
        console.log(`[TypingApp] Resize sent: ${width}x${height}`);
      });
    }
    this.currentState = newState;
  }
};

const ACTIVE_ICON_PATH = '../../assets/icons/typing-active.png';
const INACTIVE_ICON_PATH = '../../assets/icons/typing-inactive.png';
const MIC_ON_PATH = '../../assets/icons/mic-on.png';
const MIC_OFF_PATH = '../../assets/icons/mic-off.png';

function updateRecordingIndicator(isRecording) {
  const micContainer = document.querySelector('.mic-container');
  if (micContainer) {
    micContainer.style.backgroundImage = `url(${isRecording ? MIC_ON_PATH : MIC_OFF_PATH})`;
  }
  if (stateMachine.currentState === 'Active') {
    document.getElementById('recordingIndicator').src = isRecording ? MIC_ON_PATH : MIC_OFF_PATH;
  }
}

function updateTypingIcon() {
  const toggleIcon = document.getElementById('typingToggleIcon');
  if (toggleIcon) {
    toggleIcon.src = appState.typingActive ? ACTIVE_ICON_PATH : INACTIVE_ICON_PATH;
  }
}

function handleMicClick(e) {
  e.stopPropagation();
  console.log('[TypingApp] Mic clicked, sending global-toggle-recording');
  ipcRenderer.send('global-toggle-recording');
}

function handleRecordingClick(e) {
  e.stopPropagation();
  ipcRenderer.send('global-toggle-recording');
}

function handleTypingToggle(e) {
  e.stopPropagation();
  const newTypingActive = !appState.typingActive;
  appState.setTypingActive(newTypingActive);
  ipcRenderer.send('typing-app-typing-mode-changed', newTypingActive);
  updateTypingIcon();
}

function handleClose(e) {
  e.stopPropagation();
  window.close();
}

ipcRenderer.on('typing-app-update-text', (event, fullText) => {
  const typingAppText = document.getElementById('typingAppText');
  if (typingAppText) {
    typingAppText.textContent = fullText || '(Waiting for transcript...)';
    const textContainer = document.getElementById('typingAppTextContainer');
    if (textContainer) {
      textContainer.scrollTop = textContainer.scrollHeight;
    }
  }
});

ipcRenderer.on('typing-app-recording-state', (event, isRecording) => {
  console.log(`[TypingApp] Received recording state: ${isRecording}`);
  updateRecordingIndicator(isRecording);
  stateMachine.transitionTo(isRecording ? 'Active' : 'Idle');
});

document.addEventListener('DOMContentLoaded', async () => {
  console.log('[TypingApp] DOMContentLoaded, initializing');
  // Load enableTranslation from store
  const storedEnableTranslation = await ipcRenderer.invoke('store-get', 'enableTranslation', false);
  runInAction(() => { appState.setEnableTranslation(storedEnableTranslation); });
  console.log(`[TypingApp] Initialized appState.enableTranslation to: ${storedEnableTranslation}`);
  // Initialize typingActive and other values from store via IPC
  Promise.all([
    ipcRenderer.invoke('store-get', 'typingActive', false),
    ipcRenderer.invoke('store-get', 'deepgramApiKey', ''),
    ipcRenderer.invoke('store-get', 'enableTranslation', false),
    ipcRenderer.invoke('store-get', 'diarizationEnabled', false),
    ipcRenderer.invoke('store-get', 'sourceLanguage', 'nova-2|multi'),
    ipcRenderer.invoke('store-get', 'targetLanguage', 'en'),
    ipcRenderer.invoke('store-get', 'typingAppGlobalShortcut', 'CommandOrControl+Shift+T'),
    ipcRenderer.invoke('store-get', 'typingAppActiveWidth', 400),
    ipcRenderer.invoke('store-get', 'typingAppActiveHeight', 200)
  ]).then(([typingActive, deepgramApiKey, enableTranslationAgain, diarizationEnabled, sourceLanguage, targetLanguage, typingAppGlobalShortcut, typingAppActiveWidth, typingAppActiveHeight]) => {
    console.log('[TypingApp] Loaded deepgramApiKey:', deepgramApiKey);
    const { runInAction } = require("mobx");
    runInAction(() => {
      appState.setTypingActive(typingActive);
      appState.setDeepgramApiKey(deepgramApiKey);
      appState.setEnableTranslation(enableTranslationAgain);
      appState.setDiarizationEnabled(diarizationEnabled);
      appState.setSourceLanguage(sourceLanguage);
      appState.setTargetLanguage(targetLanguage);
      appState.setTypingAppGlobalShortcut(typingAppGlobalShortcut);
      appState.setTypingAppActiveWidth(typingAppActiveWidth);
      appState.setTypingAppActiveHeight(typingAppActiveHeight);
    });
    updateTypingIcon();
    ipcRenderer.send('typing-app-typing-mode-changed', appState.typingActive);
  }).catch(error => console.error('Error loading initial state:', error));
  updateRecordingIndicator(false);
  const micContainer = document.querySelector('.mic-container');
  if (micContainer) {
    micContainer.addEventListener('click', handleMicClick, { once: false });
    console.log('[TypingApp] Initial mic click listener attached');
  }
  document.getElementById('recordingIndicator').addEventListener('click', handleRecordingClick);
  document.getElementById('typingToggleIcon').addEventListener('click', handleTypingToggle);
  document.getElementById('closeButton').addEventListener('click', handleClose);
  stateMachine.transitionTo('Idle');
});

// Listen for updates to appState from main
ipcRenderer.on('update-app-state', (event, data) => {
  if (typeof data.enableTranslation !== 'undefined') {
    runInAction(() => { appState.setEnableTranslation(data.enableTranslation); });
    console.log(`[TypingApp] appState.enableTranslation updated: ${data.enableTranslation}`);
  }
});
