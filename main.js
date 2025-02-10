const { app, BrowserWindow, ipcMain } = require('electron');

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
    mainWindow.webContents.openDevTools();
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
     settingsWindow.webContents.openDevTools();
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

ipcMain.handle('type-text', async (event, text) => {
    try {
        const { keyboard } = await import('@nut-tree-fork/nut-js');
        keyboard.config.autoDelayMs = 0;
        await keyboard.type(text);
    } catch (error) {
        console.error('Error simulating typing:', error);
    }
    return true;
});

ipcMain.on('open-settings', () => {
    createSettingsWindow();
});
