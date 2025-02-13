const { app, BrowserWindow, ipcMain, globalShortcut } = require('electron');
const { simulatePaste } = require('./modules/typing/typing.js'); // Use require

let mainWindow;
let settingsWindow;
let typingAppWindow = null; // Reference for Typing App window
let isRecording = false;    // Track recording state globally
let currentGlobalShortcut = 'CommandOrControl+Shift+T'; // Default global shortcut

function registerGlobalShortcut(shortcut) {
  // Unregister any existing shortcuts
  globalShortcut.unregisterAll();
  currentGlobalShortcut = shortcut;
  // Register the new global shortcut
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

  // Register the default global shortcut
  registerGlobalShortcut(currentGlobalShortcut);
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

// -------------------- Typing App Window --------------------
function createTypingAppWindow() {
  if (typingAppWindow) {
    typingAppWindow.focus();
    return;
  }

  // Minimize main window
  if (mainWindow) {
    mainWindow.minimize();
  }

  typingAppWindow = new BrowserWindow({
    width: 400,
    height: 200,
    alwaysOnTop: true,
    frame: true, // can be set to false for a frameless look
    transparent: false, // Opacity will be controlled in the HTML/CSS
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    }
  });

  typingAppWindow.loadFile('modules/typing/typing-app.html');

  // On close: restore main window and stop recording
  typingAppWindow.on('closed', () => {
    typingAppWindow = null;
    if (mainWindow) {
      mainWindow.restore();
      mainWindow.webContents.send('typing-app-window-closed');
    }
  });
}

// -----------------------------------------------------------

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  globalShortcut.unregisterAll();
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// -------------------- IPC HANDLERS --------------------
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

// -------------------- Typing App IPC --------------------
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

// NEW: Update global shortcut from settings
ipcMain.on('update-global-shortcut', (event, newShortcut) => {
  registerGlobalShortcut(newShortcut);
});
