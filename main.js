const { app, BrowserWindow, ipcMain, globalShortcut, Tray, Menu, screen, dialog } = require('electron');
const path = require('path');
const { simulatePaste } = require('./modules/typing/typing.js');
const { restoreWindowState, saveWindowState } = require('./modules/windowState.js');

// ----- Expiration Check -----
const expirationDate = new Date("2026-07-01T00:00:00Z");
const currentDate = new Date();
if (currentDate >= expirationDate) {
    app.on('ready', () => { dialog.showErrorBox("Expired", "This app has expired and is no longer available."); app.quit(); });
} else {
    let mainWindow;
    let settingsWindow;
    let typingAppWindow = null;
    let store;

    function registerGlobalShortcut(shortcut) {
        globalShortcut.unregisterAll();
        globalShortcut.register(shortcut, () => {
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('global-toggle-recording');
            }
        });
    }

    function createMainWindow() {
        const mainDefaults = { width: 781, height: 435 };
        const restoredState = restoreWindowState(store, 'mainWindowState', mainDefaults, mainDefaults);

        mainWindow = new BrowserWindow({
            x: restoredState.x, y: restoredState.y, width: restoredState.width, height: restoredState.height,
            useContentSize: false, title: 'ScribeFlow & Translate', icon: path.join(__dirname, 'assets', 'icons', 'talking.png'),
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false,
                enableRemoteModule: true,
            },
            autoHideMenuBar: true,
        });

        mainWindow.on('ready-to-show', () => {
            // --- ROBUST INITIALIZATION ---
            // Send all necessary startup settings to the renderer once it's ready.
            const initialSettings = {
                deepgramApiKey: store.get('deepgramApiKey', ''),
                defaultInputDevice: store.get('defaultInputDevice', ''),
                enableTranslation: store.get('enableTranslation', false),
                diarizationEnabled: store.get('diarizationEnabled', false),
                sourceLanguage: store.get('sourceLanguage', 'nova-3|multi'),
                targetLanguage: store.get('targetLanguage', 'en'),
            };
            mainWindow.webContents.send('initialize-state', initialSettings);
        });

        mainWindow.loadFile('index.html');
        saveWindowState(store, 'mainWindowState', mainWindow);

        mainWindow.on('close', (e) => {
            if (process.platform === 'win32' && !app.isQuiting) { e.preventDefault(); mainWindow.hide(); }
            return false;
        });

        mainWindow.on('closed', () => { mainWindow = null; });
    }
    
    // ... createSettingsWindow, createTray, etc.
    function createSettingsWindow() { if (settingsWindow && !settingsWindow.isDestroyed()) { settingsWindow.focus(); return; } const settingsDefaults = { width: 270, height: 325 }; const restoredState = restoreWindowState(store, 'settingsWindowState', settingsDefaults, settingsDefaults); settingsWindow = new BrowserWindow({ x: restoredState.x, y: restoredState.y, width: restoredState.width, height: restoredState.height, useContentSize: false, title: 'ScribeFlow & Translate', icon: path.join(__dirname, 'assets', 'icons', 'talking.png'), webPreferences: { nodeIntegration: true, contextIsolation: false, }, autoHideMenuBar: true, }); settingsWindow.loadFile('modules/settings/settings.html'); settingsWindow.on('closed', () => { settingsWindow = null; }); saveWindowState(store, 'settingsWindowState', settingsWindow); }
    function createTray() { if (process.platform === 'win32') { const tray = new Tray(path.join(__dirname, 'assets', 'icons', 'talking.png')); const contextMenu = Menu.buildFromTemplate([ { label: 'Show App', click: () => { if (mainWindow) mainWindow.show(); }, }, { label: 'Quit', click: () => { app.isQuiting = true; app.quit(); }, }, ]); tray.setToolTip('ScribeFlow & Translate'); tray.setContextMenu(contextMenu); tray.on('click', () => { if (mainWindow) mainWindow.show(); }); } }

    app.whenReady().then(async () => {
        const StoreModule = await import('electron-store');
        const Store = StoreModule.default;
        store = new Store({
            defaults: {
                sourceLanguage: 'nova-3|multi',
                defaultInputDevice: '',
                diarizationEnabled: false,
                enableTranslation: false,
                deepgramApiKey: '',
                typingAppGlobalShortcut: 'CommandOrControl+Shift+T',
                targetLanguage: 'en',
            },
        });

        const currentGlobalShortcut = store.get('typingAppGlobalShortcut', 'CommandOrControl+Shift+T');
        registerGlobalShortcut(currentGlobalShortcut);

        createMainWindow();
        createTray();

        if (process.platform === 'darwin') {
            app.dock.setIcon(path.join(__dirname, 'assets', 'icons', 'talking.png'));
        }
    });

    app.on('window-all-closed', () => { globalShortcut.unregisterAll(); if (process.platform !== 'darwin') app.quit(); });
    app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createMainWindow(); });

    // --- IPC HANDLERS ---
    ipcMain.handle('store-get', (event, key, defaultValue) => store.get(key, defaultValue));
    
    ipcMain.handle('store-set', (event, key, value) => {
        store.set(key, value);
        console.log(`[Main] Persisted ${key} = ${value}`);
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('setting-changed', { key, value });
        }
        return true;
    });

    ipcMain.on('open-settings', createSettingsWindow);
    // ... other handlers
}
