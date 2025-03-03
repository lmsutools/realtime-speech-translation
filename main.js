// file: main.js
const { app, BrowserWindow, ipcMain, globalShortcut, Tray, Menu, screen, dialog } = require('electron');
const path = require('path');
const { simulatePaste } = require('./modules/typing/typing.js');
const { restoreWindowState, saveWindowState } = require('./modules/windowState.js');
const { appState } = require('./stores/appState.js'); // Import MobX store
const { runInAction } = require("mobx");

// ----- Expiration Check -----
const expirationDate = new Date("2025-07-01T00:00:00Z");
const currentDate = new Date();
if (currentDate >= expirationDate) {
    // When the app is ready, show the expiration error and quit.
    app.on('ready', () => {
        dialog.showErrorBox("Expired", "This app has expired and is no longer available.");
        app.quit();
    });
} else {
    // ----- The rest of the app initialization code runs only if the app is NOT expired -----
    
    // Ensure this is at the top
    let mainWindow;
    let settingsWindow;
    let typingAppWindow = null;
    let isRecording = false;
    let currentGlobalShortcut = 'CommandOrControl+Shift+T';
    let store;
    let tray = null;
    app.isQuiting = false;
    const iconPath = path.join(__dirname, 'assets', 'icons', 'talking.png');
    const appTitle = 'ScribeFlow & Translate';

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
        const mainDefaults = { width: 781, height: 435 };
        const initialMainSizes = { width: 781, height: 435 };
        const restoredState = restoreWindowState(store, 'mainWindowState', mainDefaults, initialMainSizes);
        mainWindow = new BrowserWindow({
            x: restoredState.x,
            y: restoredState.y,
            width: restoredState.width,
            height: restoredState.height,
            useContentSize: false,
            title: appTitle,
            icon: iconPath,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false,
                enableRemoteModule: true,
            },
            autoHideMenuBar: true,
        });
        mainWindow.on('ready-to-show', () => {
            setTimeout(() => {
                const currentBounds = mainWindow.getBounds();
                if (currentBounds.width < restoredState.width * 0.8 || currentBounds.height < restoredState.height * 0.8) {
                    mainWindow.setBounds({ width: restoredState.width, height: restoredState.height });
                }
            }, 200);
        });
        mainWindow.loadFile('index.html');
        saveWindowState(store, 'mainWindowState', mainWindow);
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
        // If settings window is already open, focus it.
        if (settingsWindow && !settingsWindow.isDestroyed()) {
            settingsWindow.focus();
            return;
        }
        const settingsDefaults = { width: 270, height: 325 };
        const initialSettingsSizes = { width: 270, height: 325 };
        const restoredState = restoreWindowState(store, 'settingsWindowState', settingsDefaults, initialSettingsSizes);
        settingsWindow = new BrowserWindow({
            x: restoredState.x,
            y: restoredState.y,
            width: restoredState.width,
            height: restoredState.height,
            useContentSize: false,
            title: appTitle,
            icon: iconPath,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false,
            },
            autoHideMenuBar: true,
        });
        settingsWindow.on('ready-to-show', () => {
            setTimeout(() => {
                const currentBounds = settingsWindow.getBounds();
                if (currentBounds.width < restoredState.width * 0.8 || currentBounds.height < restoredState.height * 0.8) {
                    settingsWindow.setBounds({ width: restoredState.width, height: restoredState.height });
                }
            }, 200);
        });
        settingsWindow.loadFile('modules/settings/settings.html');
        settingsWindow.on('closed', () => {
            settingsWindow = null;
        });
        saveWindowState(store, 'settingsWindowState', settingsWindow);
    }

    function ensureVisibleOnScreen(bounds) {
        const displays = screen.getAllDisplays();
        let isVisible = false;
        for (const display of displays) {
            const workArea = display.workArea;
            const intersects =
                bounds.x < workArea.x + workArea.width &&
                bounds.x + bounds.width > workArea.x &&
                bounds.y < workArea.y + workArea.height &&
                bounds.y + bounds.height > workArea.y;
            if (intersects) {
                isVisible = true;
                break;
            }
        }
        if (!isVisible) {
            const primary = screen.getPrimaryDisplay().workArea;
            return {
                x: primary.x + Math.round((primary.width - bounds.width) / 2),
                y: primary.y + Math.round((primary.height - bounds.height) / 2),
                width: bounds.width,
                height: bounds.height,
            };
        }
        return bounds;
    }

    async function createTypingAppWindow() {
        // If the typing app window is already open, focus it.
        if (typingAppWindow && !typingAppWindow.isDestroyed()) {
            typingAppWindow.focus();
            return;
        }
        const idleDefaults = { width: 90, height: 90 };
        const activeDefaults = { width: 400, height: 200 };
        const restoredState = restoreWindowState(store, 'typingAppWindowState', idleDefaults);
        const initialBounds = ensureVisibleOnScreen({
            x: restoredState.x,
            y: restoredState.y,
            width: isRecording ? activeDefaults.width : restoredState.width || idleDefaults.width,
            height: isRecording ? activeDefaults.height : restoredState.height || idleDefaults.height,
        });
        typingAppWindow = new BrowserWindow({
            x: initialBounds.x,
            y: initialBounds.y,
            width: initialBounds.width,
            height: initialBounds.height,
            useContentSize: false,
            title: appTitle,
            icon: iconPath,
            alwaysOnTop: true,
            frame: false,
            transparent: true,
            hasShadow: true,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false,
            },
            autoHideMenuBar: true,
        });
        typingAppWindow.on('ready-to-show', () => {
            typingAppWindow.webContents.send('typing-app-recording-state', isRecording);
            console.log('[Main] Typing App window ready, sent initial recording state:', isRecording);
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
                {
                    label: 'Show App',
                    click: () => {
                        if (mainWindow) mainWindow.show();
                    },
                },
                {
                    label: 'Quit',
                    click: () => {
                        app.isQuiting = true;
                        app.quit();
                    },
                },
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
                targetLanguage: 'en',
                typingAppActiveWidth: 400,
                typingAppActiveHeight: 200,
                typingActive: false, // Add default for typingActive
            },
        });
        currentGlobalShortcut = store.get('typingAppGlobalShortcut', 'CommandOrControl+Shift+T');
        registerGlobalShortcut(currentGlobalShortcut);
        createMainWindow();
        createTray();
        if (process.platform === 'darwin') {
            app.dock.setIcon(iconPath);
        }
        // Initialize appState from store on app ready, including diarization and translation states
        runInAction(() => {
            appState.setEnableTranslation(store.get('enableTranslation', false));
            appState.setSourceLanguage(store.get('sourceLanguage', 'nova-2|multi'));
            appState.setTargetLanguage(store.get('targetLanguage', 'en'));
            appState.setDeepgramApiKey(store.get('deepgramApiKey', ''));
            console.log('[Main] Initialized deepgramApiKey:', store.get('deepgramApiKey', ''));
            appState.setDiarizationEnabled(store.get('diarizationEnabled', false));
            appState.setTypingAppGlobalShortcut(store.get('typingAppGlobalShortcut', 'CommandOrControl+Shift+T'));
            appState.setTypingAppActiveWidth(store.get('typingAppActiveWidth', 400));
            appState.setTypingAppActiveHeight(store.get('typingAppActiveHeight', 200));
            appState.setTypingActive(store.get('typingActive', false));
        });
        // Notify the renderer of the initial app state
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('update-app-state', {
                enableTranslation: appState.enableTranslation,
                diarizationEnabled: appState.diarizationEnabled,
            });
        }
    });

    app.on('window-all-closed', () => {
        globalShortcut.unregisterAll();
        if (process.platform !== 'darwin') app.quit();
    });

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
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
        runInAction(() => {
            appState.setEnableTranslation(enableTranslation);
        });
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('update-translation-ui', enableTranslation);
            mainWindow.webContents.send('update-app-state', { enableTranslation });
        }
        store.set('enableTranslation', enableTranslation);
    });

    ipcMain.on('model-setting-changed', (event, selectedModel) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('update-source-languages', selectedModel);
        }
    });

    ipcMain.on('open-typing-app', () => {
        createTypingAppWindow();
    });

    ipcMain.on('typing-app-transcript-updated', (event, fullText) => {
        if (typingAppWindow && !typingAppWindow.isDestroyed()) {
            typingAppWindow.webContents.send('typing-app-update-text', fullText);
        }
    });

    ipcMain.on('typing-app-recording-state-changed', (event, recording) => {
        console.log(`[Main] Recording state changed: ${recording}`);
        isRecording = recording;
        if (typingAppWindow && !typingAppWindow.isDestroyed()) {
            typingAppWindow.webContents.send('typing-app-recording-state', isRecording);
        }
    });

    ipcMain.on('typing-app-typing-mode-changed', (event, typingActive) => {
        runInAction(() => {
            appState.setTypingActive(typingActive);
        });
        store.set('typingActive', typingActive);
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('typing-app-typing-mode-changed', typingActive);
        }
    });

    ipcMain.on('global-toggle-recording', () => {
        console.log('[Main] Received global-toggle-recording');
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('global-toggle-recording');
            console.log('[Main] Forwarded global-toggle-recording to mainWindow');
        }
    });

    ipcMain.on('typing-app-resize', (event, { width, height }) => {
        if (typingAppWindow && !typingAppWindow.isDestroyed()) {
            console.log(`[Main] Resizing Typing App to: ${width}x${height}`);
            typingAppWindow.setSize(width, height);
        }
    });

    ipcMain.on('update-global-shortcut', (event, newShortcut) => {
        registerGlobalShortcut(newShortcut);
        runInAction(() => {
            appState.setTypingAppGlobalShortcut(newShortcut);
        });
        if (store) {
            store.set('typingAppGlobalShortcut', newShortcut);
        }
    });

    // IPC handlers for store operations
    ipcMain.handle('store-get', async (event, key, defaultValue) => {
        const value = store ? store.get(key, defaultValue) : defaultValue;
        console.log(`[Main] store-get: ${key} = ${value}`);
        return value;
    });

    ipcMain.handle('store-set', async (event, key, value) => {
        if (store) {
            store.set(key, value);
            console.log(`[Main] store-set: ${key} = ${value}`);
            runInAction(() => {
                switch (key) {
                    case 'enableTranslation':
                        appState.setEnableTranslation(value);
                        break;
                    case 'sourceLanguage':
                        appState.setSourceLanguage(value);
                        break;
                    case 'targetLanguage':
                        appState.setTargetLanguage(value);
                        break;
                    case 'deepgramApiKey':
                        appState.setDeepgramApiKey(value);
                        console.log(`[Main] Updated appState.deepgramApiKey: ${value}`);
                        break;
                    case 'diarizationEnabled':
                        appState.setDiarizationEnabled(value);
                        break;
                    case 'typingAppGlobalShortcut':
                        appState.setTypingAppGlobalShortcut(value);
                        break;
                    case 'typingAppActiveWidth':
                        appState.setTypingAppActiveWidth(value);
                        break;
                    case 'typingAppActiveHeight':
                        appState.setTypingAppActiveHeight(value);
                        break;
                    case 'typingActive':
                        appState.setTypingActive(value);
                        break;
                }
            });
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
} // <-- End of expiration else block
