const { app, BrowserWindow, ipcMain, clipboard } = require('electron');

let mainWindow;
let settingsWindow;

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
    settingsWindow.loadFile('settings.html');
    settingsWindow.on('closed', () => {
        settingsWindow = null;
    });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

ipcMain.handle('paste-text', async (event, text) => {
    clipboard.writeText(text);

    try {
        const { keyboard, Key } = await import('@nut-tree-fork/nut-js');
        keyboard.config.autoDelayMs = 0;

        const modifierKey = process.platform === 'darwin' ? Key.LeftSuper : Key.LeftControl;

        await keyboard.pressKey(modifierKey);
        await keyboard.pressKey(Key.V);
        await keyboard.releaseKey(Key.V);
        await keyboard.releaseKey(modifierKey);

    } catch (error) {
        console.error('Error simulating paste:', error);
    }
    return true;
});

ipcMain.on('open-settings', () => {
    createSettingsWindow();
});

ipcMain.on('translation-setting-changed', (event, enableTranslation) => {
    if (mainWindow) {
        mainWindow.webContents.send('update-translation-ui', enableTranslation);
    }
});

// Listen for model setting changes from settings window
ipcMain.on('model-setting-changed', (event, selectedModel) => {
    if (mainWindow) {
        mainWindow.webContents.send('update-source-languages', selectedModel);
    }
});
