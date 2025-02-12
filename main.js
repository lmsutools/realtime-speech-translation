const { app, BrowserWindow, ipcMain } = require('electron');
const { simulatePaste } = require('./modules/typing/typing.js'); // Use require

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
    settingsWindow.loadFile('modules/settings/settings.html');
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
    try {
        await simulatePaste(text); // Call the function from the typing module
        return true; // Indicate success
    } catch (error) {
        console.error('Error in paste-text handler:', error);
        return false; // Indicate failure
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

// Listen for model setting changes from settings window
ipcMain.on('model-setting-changed', (event, selectedModel) => {
    if (mainWindow) {
        mainWindow.webContents.send('update-source-languages', selectedModel);
    }
});
