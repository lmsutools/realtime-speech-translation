const { app, BrowserWindow, ipcMain, globalShortcut } = require('electron');
const { simulatePaste } = require('./modules/typing/typing.js'); // Use require

let mainWindow;
let settingsWindow;
let typingAppWindow = null; // Keep reference to the Typing App window
let isRecording = false;    // Track recording state globally

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

  // Register global hotkey: Ctrl+Shift+T to toggle start/stop
  app.whenReady().then(() => {
    globalShortcut.register('CommandOrControl+Shift+T', () => {
      if (!mainWindow) return;
      // Send message to main renderer: "toggle recording"
      mainWindow.webContents.send('global-toggle-recording');
    });
  });
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

// -------------------- NEW: Typing App Window --------------------
function createTypingAppWindow() {
  if (typingAppWindow) {
    // If already open, just focus it
    typingAppWindow.focus();
    return;
  }

  // Minimize main window
  if (mainWindow) {
    mainWindow.minimize();
  }

  // Create the mini “Typing App” window
  typingAppWindow = new BrowserWindow({
    width: 400,
    height: 200,
    alwaysOnTop: true,
    frame: true,  // set to false to make it frameless
    transparent: false, // we will control the opacity with CSS in the content
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    }
  });

  typingAppWindow.loadFile('modules/typing/typing-app.html');

  // On close: restore main window, stop recording, and reset reference
  typingAppWindow.on('closed', () => {
    typingAppWindow = null;
    // Notify renderer to stop recording
    if (mainWindow) {
      mainWindow.restore();
      mainWindow.webContents.send('typing-app-window-closed'); 
    }
  });
}

// ---------------------------------------------------------------

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  // Unregister all shortcuts
  globalShortcut.unregisterAll();

  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// -------------------- IPC HANDLERS --------------------

// For text-pasting from the renderer
ipcMain.handle('paste-text', async (event, text) => {
  try {
    await simulatePaste(text); // Call the function from the typing module
    return true; // Indicate success
  } catch (error) {
    console.error('Error in paste-text handler:', error);
    return false; // Indicate failure
  }
});

// Opens the Settings window
ipcMain.on('open-settings', () => {
  createSettingsWindow();
});

// For translation setting changes -> updates the main window UI
ipcMain.on('translation-setting-changed', (event, enableTranslation) => {
  if (mainWindow) {
    mainWindow.webContents.send('update-translation-ui', enableTranslation);
  }
});

// For model setting changes -> updates the main window’s source languages
ipcMain.on('model-setting-changed', (event, selectedModel) => {
  if (mainWindow) {
    mainWindow.webContents.send('update-source-languages', selectedModel);
  }
});

// -------------------- NEW: Typing App IPC --------------------
ipcMain.on('open-typing-app', () => {
  createTypingAppWindow();
});

// Forward transcript updates from renderer to typing-app window
ipcMain.on('typing-app-transcript-updated', (event, fullText) => {
  if (typingAppWindow) {
    typingAppWindow.webContents.send('typing-app-update-text', fullText);
  }
});

// Forward recording state changes to typing-app window
ipcMain.on('typing-app-recording-state-changed', (event, recording) => {
  isRecording = recording;
  if (typingAppWindow) {
    typingAppWindow.webContents.send('typing-app-recording-state', isRecording);
  }
});
