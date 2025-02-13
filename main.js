//never add any comments at the same line of the reference file path
const { app, BrowserWindow, ipcMain, globalShortcut } = require('electron');
const { simulatePaste } = require('./modules/typing/typing.js');

// Import our new windowState module
const { restoreWindowState, saveWindowState } = require('./modules/windowState.js');

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

function createMainWindow() {
  // Restore window state for "mainWindowState"
  const mainDefaults = { width: 800, height: 600 };
  const { x, y, width, height } = restoreWindowState(store, 'mainWindowState', mainDefaults);

  mainWindow = new BrowserWindow({
    x,
    y,
    width,
    height,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
    },
    autoHideMenuBar: true,
  });
  mainWindow.loadFile('index.html');

  // Save window state on move/resize/close
  saveWindowState(store, 'mainWindowState', mainWindow);
}

function createSettingsWindow() {
  if (settingsWindow) {
    settingsWindow.focus();
    return;
  }

  // We can similarly store settingsWindow size/position if desired:
  const settingsDefaults = { width: 400, height: 500 };
  const { x, y, width, height } = restoreWindowState(store, 'settingsWindowState', settingsDefaults);

  settingsWindow = new BrowserWindow({
    x,
    y,
    width,
    height,
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

  // track settings window bounds
  saveWindowState(store, 'settingsWindowState', settingsWindow);
}

function createTypingAppWindow() {
  if (typingAppWindow) {
    typingAppWindow.focus();
    return;
  }
  if (mainWindow) {
    mainWindow.minimize();
  }

  // If we want to track the typing window also
  const typingDefaults = { width: 400, height: 200 };
  const { x, y, width, height } = restoreWindowState(store, 'typingAppWindowState', typingDefaults);

  typingAppWindow = new BrowserWindow({
    x,
    y,
    width,
    height,
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

  saveWindowState(store, 'typingAppWindowState', typingAppWindow);
}

app.whenReady().then(async () => {
  // Import electron-store dynamically to avoid ESM issues
  const StoreModule = await import('electron-store');
  const Store = StoreModule.default;
  store = new Store({
    defaults: {
      model: 'nova-2',
      sourceLanguage: 'multi',
      defaultInputDevice: '',
      diarizationEnabled: false,
      enableTranslation: false,
      deepgramApiKey: '',
      translateDefaultAiProvider: 'Google AI',
      translateDefaultAiModel: 'gemini-2.0-flash-001',
      aiProviders: '[]',
      typingAppGlobalShortcut: 'CommandOrControl+Shift+T',
      targetLanguage: 'en'
    }
  });

  currentGlobalShortcut = store.get('typingAppGlobalShortcut', 'CommandOrControl+Shift+T');
  registerGlobalShortcut(currentGlobalShortcut);

  createMainWindow();
});

app.on('window-all-closed', () => {
  globalShortcut.unregisterAll();
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
});

// =============== Existing IPC Logic Below ===============
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

// electron-store bridging
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
