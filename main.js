//never add any comments at the same line of the reference file path
const { app, BrowserWindow, ipcMain, globalShortcut, Tray, Menu } = require('electron');
const path = require('path');
const { simulatePaste } = require('./modules/typing/typing.js');
const { restoreWindowState, saveWindowState } = require('./modules/windowState.js');

let mainWindow;
let settingsWindow;
let typingAppWindow = null;
let isRecording = false;
let currentGlobalShortcut = 'CommandOrControl+Shift+T';
let store; // electron-store instance
let tray = null;
app.isQuiting = false; // flag to indicate if the app is quitting

// Define the shared icon and app title
const iconPath = path.join(__dirname, 'assets', 'icons', 'talking.png');
const appTitle = 'SonikSpeech & Live Translate';

function registerGlobalShortcut(shortcut) {
  globalShortcut.unregisterAll();
  currentGlobalShortcut = shortcut;
  globalShortcut.register(shortcut, () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('global-toggle-recording');
    }
  });
}

function createMainWindow() {
  const mainDefaults = { width: 800, height: 600 };
  const { x, y, width, height } = restoreWindowState(store, 'mainWindowState', mainDefaults);

  mainWindow = new BrowserWindow({
    x,
    y,
    width,
    height,
    title: appTitle,
    icon: iconPath,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
    },
    autoHideMenuBar: true,
  });

  mainWindow.loadFile('index.html');
  saveWindowState(store, 'mainWindowState', mainWindow);

  // When main window is attempted to be closed, minimize to tray on Windows
  mainWindow.on('close', (e) => {
    if (process.platform === 'win32' && !app.isQuiting) {
      e.preventDefault();
      mainWindow.hide();
    }
    return false;
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createSettingsWindow() {
  if (settingsWindow) {
    settingsWindow.focus();
    return;
  }
  const settingsDefaults = { width: 400, height: 500 };
  const { x, y, width, height } = restoreWindowState(store, 'settingsWindowState', settingsDefaults);

  settingsWindow = new BrowserWindow({
    x,
    y,
    width,
    height,
    title: appTitle,
    icon: iconPath,
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
  saveWindowState(store, 'settingsWindowState', settingsWindow);
}

function createTypingAppWindow() {
  if (typingAppWindow) {
    typingAppWindow.focus();
    return;
  }
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.minimize();
  }
  const typingDefaults = { width: 400, height: 200 };
  const { x, y, width, height } = restoreWindowState(store, 'typingAppWindowState', typingDefaults);

  typingAppWindow = new BrowserWindow({
    x,
    y,
    width,
    height,
    title: appTitle,
    icon: iconPath,
    alwaysOnTop: true,
    frame: false,
    transparent: true,
    hasShadow: true,
    webPreferences: { nodeIntegration: true, contextIsolation: false },
  });

  typingAppWindow.loadFile('modules/typing/typing-app.html');

  typingAppWindow.on('closed', () => {
    typingAppWindow = null;
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.restore();
      mainWindow.webContents.send('typing-app-window-closed');
    }
  });
  saveWindowState(store, 'typingAppWindowState', typingAppWindow);
}

function createTray() {
  if (process.platform === 'win32') {
    tray = new Tray(iconPath);
    const contextMenu = Menu.buildFromTemplate([
      { label: 'Show App', click: () => { if (mainWindow) mainWindow.show(); } },
      { label: 'Quit', click: () => { app.isQuiting = true; app.quit(); } }
    ]);
    tray.setToolTip(appTitle);
    tray.setContextMenu(contextMenu);
    tray.on('click', () => {
      if (mainWindow) mainWindow.show();
    });
  }
}

app.whenReady().then(async () => {
  const StoreModule = await import('electron-store');
  const Store = StoreModule.default;
  store = new Store({
    defaults: {
      model: 'nova-2',
      sourceLanguage: 'nova-2|multi',
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
  createTray();
  // For macOS, set the dock icon
  if (process.platform === 'darwin') {
    app.dock.setIcon(iconPath);
  }
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

ipcMain.on('open-settings', () => { createSettingsWindow(); });

ipcMain.on('translation-setting-changed', (event, enableTranslation) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-translation-ui', enableTranslation);
  }
});

ipcMain.on('model-setting-changed', (event, selectedModel) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-source-languages', selectedModel);
  }
});

ipcMain.on('open-typing-app', () => { createTypingAppWindow(); });

ipcMain.on('typing-app-transcript-updated', (event, fullText) => {
  if (typingAppWindow && !typingAppWindow.isDestroyed()) {
    typingAppWindow.webContents.send('typing-app-update-text', fullText);
  }
});

ipcMain.on('typing-app-recording-state-changed', (event, recording) => {
  isRecording = recording;
  if (typingAppWindow && !typingAppWindow.isDestroyed()) {
    typingAppWindow.webContents.send('typing-app-recording-state', isRecording);
  }
});

ipcMain.on('typing-app-typing-mode-changed', (event, typingActive) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('typing-app-typing-mode-changed', typingActive);
  }
});

ipcMain.on('global-toggle-recording', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('global-toggle-recording');
  }
});

ipcMain.on('update-global-shortcut', (event, newShortcut) => {
  registerGlobalShortcut(newShortcut);
  if (store) { store.set('typingAppGlobalShortcut', newShortcut); }
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
