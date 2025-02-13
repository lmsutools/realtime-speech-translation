const { app, BrowserWindow, ipcMain, globalShortcut } = require('electron');
const { simulatePaste } = require('./modules/typing/typing.js');

let mainWindow;
let settingsWindow;
let typingAppWindow = null;
let isRecording = false;
let currentGlobalShortcut = 'CommandOrControl+Shift+T';
let store; // electron-store instance

function registerGlobalShortcut(shortcut) {
  globalShortcut.unregisterAll();
  currentGlobalShortcut = shortcut;
  globalShortcut.register(shortcut, () => {
    if (mainWindow) {
      mainWindow.webContents.send('global-toggle-recording');
    }
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
    },
    autoHideMenuBar: true,
  });
  mainWindow.loadFile('index.html');
}

function createSettingsWindow() {
  if (settingsWindow) {
    settingsWindow.focus();
    return;
  }
  settingsWindow = new BrowserWindow({
    width: 400,
    height: 500,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    autoHideMenuBar: true,
  });
  settingsWindow.loadFile('modules/settings/settings.html');
  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });
}

function createTypingAppWindow() {
  if (typingAppWindow) {
    typingAppWindow.focus();
    return;
  }
  if (mainWindow) {
    mainWindow.minimize();
  }
  typingAppWindow = new BrowserWindow({
    width: 400,
    height: 200,
    alwaysOnTop: true,
    frame: true,
    transparent: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });
  typingAppWindow.loadFile('modules/typing/typing-app.html');
  typingAppWindow.on('closed', () => {
    typingAppWindow = null;
    if (mainWindow) {
      mainWindow.restore();
      mainWindow.webContents.send('typing-app-window-closed');
    }
  });
}

app.whenReady().then(async () => {
  // Dynamically import electron-store to avoid webpack ESM issues.
  const StoreModule = await import('electron-store');
  const Store = StoreModule.default;
  store = new Store({
    defaults: {
      model: 'nova-2',                   // Speech model
      sourceLanguage: 'multi',           // Speech language
      defaultInputDevice: '',
      diarizationEnabled: false,
      enableTranslation: false,
      deepgramApiKey: '',
      translateDefaultAiProvider: 'Google AI',  // Translation default provider
      translateDefaultAiModel: 'gemini-2.0-flash-001', // Translation default model
      aiProviders: '[]',
      typingAppGlobalShortcut: 'CommandOrControl+Shift+T',
      targetLanguage: 'en'
    }
  });

  // Load global shortcut from persistent store.
  currentGlobalShortcut = store.get('typingAppGlobalShortcut', 'CommandOrControl+Shift+T');
  registerGlobalShortcut(currentGlobalShortcut);

  createWindow();
});

app.on('window-all-closed', () => {
  globalShortcut.unregisterAll();
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

ipcMain.handle('paste-text', async (event, text) => {
  try {
    await simulatePaste(text);
    return true;
  } catch (error) {
    console.error('Error in paste-text handler:', error);
    return false;
  }
});

ipcMain.on('open-settings', () => {
  createSettingsWindow();
});

ipcMain.on('translation-setting-changed', (event, enableTranslation) => {
  if (mainWindow) {
    mainWindow.webContents.send('update-translation-ui', enableTranslation);
  }
});

ipcMain.on('model-setting-changed', (event, selectedModel) => {
  if (mainWindow) {
    mainWindow.webContents.send('update-source-languages', selectedModel);
  }
});

ipcMain.on('open-typing-app', () => {
  createTypingAppWindow();
});

ipcMain.on('typing-app-transcript-updated', (event, fullText) => {
  if (typingAppWindow) {
    typingAppWindow.webContents.send('typing-app-update-text', fullText);
  }
});

ipcMain.on('typing-app-recording-state-changed', (event, recording) => {
  isRecording = recording;
  if (typingAppWindow) {
    typingAppWindow.webContents.send('typing-app-recording-state', isRecording);
  }
});

ipcMain.on('update-global-shortcut', (event, newShortcut) => {
  registerGlobalShortcut(newShortcut);
  if (store) {
    store.set('typingAppGlobalShortcut', newShortcut);
  }
});

// ---------------------- Persistent Store IPC Handlers ----------------------
ipcMain.handle('store-get', async (event, key, defaultValue) => {
  return store ? store.get(key, defaultValue) : defaultValue;
});

ipcMain.handle('store-set', async (event, key, value) => {
  if (store) {
    store.set(key, value);
    return true;
  }
  return false;
});

ipcMain.handle('store-delete', async (event, key) => {
  if (store) {
    store.delete(key);
    return true;
  }
  return false;
});
