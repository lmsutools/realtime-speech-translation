const { app, BrowserWindow, ipcMain, globalShortcut, Tray, Menu, screen, dialog } = require('electron');
const path = require('path');
const remoteMain = require('@electron/remote/main'); // For @electron/remote
const { simulatePaste } = require('./modules/typing/typing.js');
const { restoreWindowState, saveWindowState } = require('./modules/windowState.js');
const { appState } = require('./stores/appState.js');
const { runInAction } = require("mobx");

// Initialize @electron/remote in the main process
remoteMain.initialize();

const expirationDate = new Date("2025-07-01T00:00:00Z");
const currentDate = new Date();

if (currentDate >= expirationDate) {
  app.on('ready', () => {
    dialog.showErrorBox("Expired", "This app has expired and is no longer available.");
    app.quit();
  });
} else {
  let mainWindow;
  let settingsWindow;
  let typingAppWindow = null;
  let isRecording = false;
  let currentGlobalShortcut = 'CommandOrControl+Shift+T';
  let store;
  let tray = null;
  app.isQuiting = false; // Custom flag for quit logic

  // Ensure this path is correct and the icon exists.
  // For tray and window icons at runtime.
  // The main application icon for the build is specified in package.json
  const iconPath = path.join(__dirname, 'assets', 'icons', 'talking.png');
  const appTitle = 'ScribeFlow & Translate';

  function registerGlobalShortcut(shortcut) {
    globalShortcut.unregisterAll();
    currentGlobalShortcut = shortcut;
    if (shortcut && shortcut.length > 0) {
      try {
        const success = globalShortcut.register(shortcut, () => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('global-toggle-recording');
          }
        });
        if (!success) {
          console.error(`[Main] Failed to register global shortcut: ${shortcut}`);
        } else {
          console.log(`[Main] Global shortcut registered: ${shortcut}`);
        }
      } catch (error) {
        console.error(`[Main] Error registering global shortcut ${shortcut}:`, error);
      }
    } else {
      console.warn("[Main] Attempted to register an empty global shortcut.");
    }
  }

  const defaultWebPreferences = {
    nodeIntegration: false, // Keep false for security
    contextIsolation: true, // Keep true for security
    preload: path.join(__dirname, 'preload.js'), // Use a preload script
    // enableRemoteModule: false, // Deprecated and not needed with @electron/remote v2+
  };

  function createMainWindow() {
    const mainDefaults = { width: 781, height: 435 };
    const initialMainSizes = { width: 781, height: 435 }; // Can be same as defaults or different
    const restoredState = restoreWindowState(store, 'mainWindowState', mainDefaults, initialMainSizes);

    mainWindow = new BrowserWindow({
      x: restoredState.x,
      y: restoredState.y,
      width: restoredState.width,
      height: restoredState.height,
      useContentSize: false, // Consider if true is more appropriate
      title: appTitle,
      icon: iconPath,
      webPreferences: {
        ...defaultWebPreferences
      },
      autoHideMenuBar: true,
    });

    remoteMain.enable(mainWindow.webContents); // Enable @electron/remote for this window

    mainWindow.on('ready-to-show', () => {
      // Optional: Adjust size if restored size is too small (example logic)
      setTimeout(() => {
        const currentBounds = mainWindow.getBounds();
        if (currentBounds.width < restoredState.width * 0.8 || currentBounds.height < restoredState.height * 0.8) {
          mainWindow.setBounds({ width: restoredState.width, height: restoredState.height });
        }
      }, 200); // Delay to ensure window is fully initialized
       if (process.env.NODE_ENV !== 'production') { // Open DevTools in dev mode
           mainWindow.webContents.openDevTools();
       }
    });

    mainWindow.loadFile('index.html');
    saveWindowState(store, 'mainWindowState', mainWindow); // Ensure this is called appropriately (e.g., on resize/move)

    mainWindow.on('close', (e) => {
      if (process.platform === 'win32' && !app.isQuiting) {
        e.preventDefault();
        mainWindow.hide();
        return false; // Recommended by Electron docs for preventDefault on close
      }
      // For other platforms or if app.isQuiting is true, allow close
    });

    mainWindow.on('closed', () => {
      mainWindow = null;
    });
  }

  function createSettingsWindow() {
    if (settingsWindow && !settingsWindow.isDestroyed()) {
      settingsWindow.focus();
      return;
    }
    const settingsDefaults = { width: 270, height: 325 };
    const restoredState = restoreWindowState(store, 'settingsWindowState', settingsDefaults);

    settingsWindow = new BrowserWindow({
      x: restoredState.x,
      y: restoredState.y,
      width: restoredState.width,
      height: restoredState.height,
      useContentSize: false,
      title: `${appTitle} - Settings`,
      icon: iconPath,
      webPreferences: {
        ...defaultWebPreferences
      },
      autoHideMenuBar: true,
      parent: mainWindow, // Optional: makes it a child of mainWindow
      modal: false, // Optional: if true, blocks interaction with parent
    });

    remoteMain.enable(settingsWindow.webContents);

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
        console.warn('[Main] Window was off-screen, repositioning to primary display center.');
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
    if (typingAppWindow && !typingAppWindow.isDestroyed()) {
      typingAppWindow.focus();
      return;
    }
    const idleDefaults = { width: 90, height: 90 };
    const activeDefaults = { width: store.get('typingAppActiveWidth', 400), height: store.get('typingAppActiveHeight', 200) };
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
      title: `${appTitle} - Typing Assistant`,
      icon: iconPath,
      alwaysOnTop: true,
      frame: false,
      transparent: true,
      hasShadow: true, // Set to false if transparency issues occur
      webPreferences: {
        ...defaultWebPreferences
      },
      autoHideMenuBar: true,
    });

    remoteMain.enable(typingAppWindow.webContents);

    typingAppWindow.on('ready-to-show', () => {
      typingAppWindow.webContents.send('typing-app-recording-state', isRecording);
      console.log('[Main] Typing App window ready, sent initial recording state:', isRecording);
    });

    typingAppWindow.loadFile('modules/typing/typing-app.html');
    typingAppWindow.on('closed', () => {
      typingAppWindow = null;
      if (mainWindow && !mainWindow.isDestroyed()) {
        // mainWindow.restore(); // This might not be needed if it was just hidden
        mainWindow.webContents.send('typing-app-window-closed');
      }
    });
    saveWindowState(store, 'typingAppWindowState', typingAppWindow);
  }

  function createTray() {
    if (process.platform === 'win32') { // Tray is common on Windows
      if (!tray) { // Create tray only if it doesn't exist
        tray = new Tray(iconPath);
        const contextMenu = Menu.buildFromTemplate([
          {
            label: 'Show App',
            click: () => {
              if (mainWindow) {
                if (mainWindow.isMinimized()) mainWindow.restore();
                mainWindow.show();
                mainWindow.focus();
              } else {
                createMainWindow(); // Recreate if closed
              }
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
          if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.show();
            mainWindow.focus();
          } else {
            createMainWindow();
          }
        });
      }
    }
  }

  app.whenReady().then(async () => {
    try {
      const StoreModule = await import('electron-store');
      const Store = StoreModule.default;
      store = new Store({
        name: 'scribeflow-config',
        fileExtension: 'json',
        clearInvalidConfig: false,
        serialize: value => JSON.stringify(value, null, 2),
        deserialize: JSON.parse,
        projectVersion: app.getVersion(), // Use app version
        migrations: {
          // Example migration
          // '0.9.0': storeInstance => {
          //   storeInstance.set('newSetting', true);
          // },
        },
        defaults: {
          model: 'nova-2',
          sourceLanguage: 'nova-2|multi',
          defaultInputDevice: '',
          diarizationEnabled: false,
          enableTranslation: false,
          deepgramApiKey: '',
          translateDefaultAiProvider: 'openai',
          translateDefaultAiModel: 'gpt-3.5-turbo',
          aiProviders: JSON.stringify([{ id: 'openai', name: "OpenAI", apiKeySettingKey: 'aiProviderApiKey_openai', models: ['gpt-3.5-turbo', 'o3-mini-2025-01-31', 'gpt-4o-mini'], defaultModel: 'gpt-3.5-turbo', endpoint: "https://api.openai.com/v1/chat/completions" }]),
          typingAppGlobalShortcut: 'CommandOrControl+Shift+T',
          targetLanguage: 'en',
          typingAppActiveWidth: 400,
          typingAppActiveHeight: 200,
          typingActive: false,
          autoStopTimer: 60,
          sourceAutoScrollEnabled: true,
          translatedAutoScrollEnabled: true,
        },
      });
      console.log('[Store] Configuration file location:', store.path);
      console.log('[Store] Store size:', store.size);

      const testKey = 'storeTest_' + Date.now();
      store.set(testKey, 'test-value');
      const testValue = store.get(testKey);
      store.delete(testKey);
      if (testValue !== 'test-value') {
        throw new Error('Store read/write test failed');
      }
      console.log('[Store] Store persistence test passed');

    } catch (error) {
      console.error('[Store] Error initializing electron-store:', error);
      dialog.showErrorBox('Configuration Error', `Failed to initialize app configuration storage. Settings may not persist.\n\nError: ${error.message}\n\nThe app will continue but you may need to re-enter settings each time.`);
      store = { // Basic in-memory fallback
        data: {},
        get: function(key, defaultValue) { return this.data.hasOwnProperty(key) ? this.data[key] : defaultValue; },
        set: function(key, value) { this.data[key] = value; return true; },
        delete: function(key) { delete this.data[key]; return true; },
        path: 'memory-fallback',
        size: 0
      };
    }

    currentGlobalShortcut = store.get('typingAppGlobalShortcut', 'CommandOrControl+Shift+T');
    registerGlobalShortcut(currentGlobalShortcut);

    createMainWindow();
    createTray();

    if (process.platform === 'darwin') {
      app.dock.setIcon(iconPath); // Set Dock icon on macOS
    }

    // Initialize MobX appState from store
    runInAction(() => {
      appState.setEnableTranslation(store.get('enableTranslation', false));
      appState.setSourceLanguage(store.get('sourceLanguage', 'nova-2|multi'));
      appState.setTargetLanguage(store.get('targetLanguage', 'en'));
      appState.setDeepgramApiKey(store.get('deepgramApiKey', ''));
      console.log('[Main] Initialized deepgramApiKey from store:', store.get('deepgramApiKey', ''));
      appState.setDiarizationEnabled(store.get('diarizationEnabled', false));
      appState.setTypingAppGlobalShortcut(store.get('typingAppGlobalShortcut', 'CommandOrControl+Shift+T'));
      appState.setTypingAppActiveWidth(store.get('typingAppActiveWidth', 400));
      appState.setTypingAppActiveHeight(store.get('typingAppActiveHeight', 200));
      appState.setTypingActive(store.get('typingActive', false));
    });

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-app-state', {
        enableTranslation: appState.enableTranslation,
        diarizationEnabled: appState.diarizationEnabled,
      });
    }
  });

  app.on('window-all-closed', () => {
    // On macOS it's common to keep the app running until explicitly quit
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('before-quit', () => {
    console.log('[Main] Before quit triggered.');
    app.isQuiting = true; // Ensure flag is set
    globalShortcut.unregisterAll(); // Clean up shortcuts

    // Attempt to save critical settings from MobX store back to electron-store
    if (store && store.path !== 'memory-fallback') {
        try {
            console.log('[Main] Forcing final save of MobX appState to electron-store before quit.');
            store.set('enableTranslation', appState.enableTranslation);
            store.set('sourceLanguage', appState.sourceLanguage);
            store.set('targetLanguage', appState.targetLanguage);
            store.set('deepgramApiKey', appState.deepgramApiKey);
            store.set('diarizationEnabled', appState.diarizationEnabled);
            store.set('typingAppGlobalShortcut', appState.typingAppGlobalShortcut);
            store.set('typingAppActiveWidth', appState.typingAppActiveWidth);
            store.set('typingAppActiveHeight', appState.typingAppActiveHeight);
            store.set('typingActive', appState.typingActive);
            console.log('[Main] Final save completed.');
        } catch (error) {
            console.error('[Main] Error during final save of MobX appState:', error);
        }
    }
  });

  app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    } else if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show(); // If main window exists but is hidden (e.g. on Windows), show it
    }
  });

  // IPC Handlers
  ipcMain.handle('paste-text', async (event, text) => {
    try {
      await simulatePaste(text);
      return { success: true };
    } catch (error) {
      console.error('[Main IPC] Error in paste-text handler:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.on('open-settings', () => {
    createSettingsWindow();
  });

  ipcMain.on('open-typing-app', () => {
    createTypingAppWindow();
  });

  // Listener for changes from renderer/settings that affect MobX state and electron-store
  ipcMain.on('setting-changed', (event, { key, value }) => {
    if (!store || store.path === 'memory-fallback') {
        console.warn(`[Main IPC] Store not available for setting key: ${key}`);
        return;
    }
    try {
        const logValue = (typeof key === 'string' && (key.toLowerCase().includes('apikey') || key.toLowerCase().includes('key')))
            ? '***REDACTED***'
            : (typeof value === 'string' && value.length > 100 ? value.substring(0, 100) + '...' : value);
        console.log(`[Main IPC] Setting changed via IPC: ${key} = ${logValue}`);
        store.set(key, value);

        // Update MobX appState accordingly
        runInAction(() => {
            switch (key) {
                case 'enableTranslation': appState.setEnableTranslation(value); break;
                case 'sourceLanguage': appState.setSourceLanguage(value); break;
                case 'targetLanguage': appState.setTargetLanguage(value); break;
                case 'deepgramApiKey': appState.setDeepgramApiKey(value); break;
                case 'diarizationEnabled': appState.setDiarizationEnabled(value); break;
                case 'typingAppGlobalShortcut':
                    appState.setTypingAppGlobalShortcut(value);
                    registerGlobalShortcut(value); // Re-register shortcut
                    break;
                case 'typingAppActiveWidth': appState.setTypingAppActiveWidth(value); break;
                case 'typingAppActiveHeight': appState.setTypingAppActiveHeight(value); break;
                case 'typingActive': appState.setTypingActive(value); break;
                default:
                    console.warn(`[Main IPC] Unhandled key for MobX update: ${key}`);
            }
        });

        // Optionally, broadcast change to other windows if needed
        if (key === 'enableTranslation' && mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('update-translation-ui', value);
            mainWindow.webContents.send('update-app-state', { enableTranslation: value });
        }
        if (key === 'model' && mainWindow && !mainWindow.isDestroyed()) { // Assuming 'model' is a key you use
            mainWindow.webContents.send('update-source-languages', value);
        }
         if (key === 'typingActive' && mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('typing-app-typing-mode-changed', value);
        }

    } catch (error) {
        console.error(`[Main IPC] Error setting key ${key} via IPC:`, error);
    }
  });


  ipcMain.on('typing-app-transcript-updated', (event, fullText) => {
    if (typingAppWindow && !typingAppWindow.isDestroyed()) {
      typingAppWindow.webContents.send('typing-app-update-text', fullText);
    }
  });

  ipcMain.on('typing-app-recording-state-changed', (event, recording) => {
    console.log(`[Main IPC] Recording state changed from typing app: ${recording}`);
    isRecording = recording;
    if (typingAppWindow && !typingAppWindow.isDestroyed()) {
      typingAppWindow.webContents.send('typing-app-recording-state', isRecording);
    }
    // Also inform main window if needed
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('recording-state-update-from-typing-app', isRecording);
    }
  });

  ipcMain.on('global-toggle-recording-request-from-renderer', () => {
    console.log('[Main IPC] Received global-toggle-recording request from renderer');
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('global-toggle-recording'); // Forward to main window's renderer to handle logic
        console.log('[Main IPC] Forwarded global-toggle-recording to mainWindow renderer');
    }
  });


  ipcMain.on('typing-app-resize', (event, { width, height }) => {
    if (typingAppWindow && !typingAppWindow.isDestroyed()) {
      console.log(`[Main IPC] Resizing Typing App to: ${width}x${height}`);
      typingAppWindow.setSize(Math.round(width), Math.round(height)); // Ensure integer values
    }
  });

  // Store IPC handlers using 'handle' for async operations
  ipcMain.handle('store-get', async (event, key, defaultValue) => {
    if (!store || store.path === 'memory-fallback') {
        console.warn(`[Store IPC] Store not available for GET key: ${key}`);
        return defaultValue;
    }
    try {
      const value = store.get(key, defaultValue);
      // console.log(`[Store IPC] GET: ${key} = ${ (typeof value === 'string' && value.length > 100) ? value.substring(0,100)+'...' : value }`);
      return value;
    } catch (error) {
      console.error(`[Store IPC] Error GET key ${key}:`, error);
      return defaultValue;
    }
  });

  ipcMain.handle('store-set', async (event, key, value) => {
    // This is now largely handled by 'setting-changed' IPC.
    // Kept for direct store access if needed, but prefer 'setting-changed' for MobX sync.
    if (!store || store.path === 'memory-fallback') {
        console.warn(`[Store IPC] Store not available for SET key: ${key}`);
        return false;
    }
    try {
      const logValue = (typeof key === 'string' && (key.toLowerCase().includes('apikey') || key.toLowerCase().includes('key')))
        ? '***REDACTED***'
        : (typeof value === 'string' && value.length > 100 ? value.substring(0, 100) + '...' : value);
      console.log(`[Store IPC] SET: ${key} = ${logValue}`);
      store.set(key, value);
      // Note: This direct 'store-set' does NOT automatically update MobX appState.
      // Use the 'setting-changed' IPC for that.
      return true;
    } catch (error) {
      console.error(`[Store IPC] Error SET key ${key}:`, error);
      return false;
    }
  });

  ipcMain.handle('store-delete', async (event, key) => {
    if (!store || store.path === 'memory-fallback') {
        console.warn(`[Store IPC] Store not available for DELETE key: ${key}`);
        return false;
    }
    try {
      console.log(`[Store IPC] DELETE: ${key}`);
      store.delete(key);
      // Note: This direct 'store-delete' does NOT automatically update MobX appState.
      return true;
    } catch (error) {
      console.error(`[Store IPC] Error DELETE key ${key}:`, error);
      return false;
    }
  });

  ipcMain.handle('store-info', async (event) => {
    if (!store || store.path === 'memory-fallback') {
        return { available: false, path: store ? store.path : 'none', size: 0, error: 'Store not available or using memory fallback' };
    }
    try {
      return {
        available: true,
        path: store.path,
        size: store.size,
        keys: Object.keys(store.store || {}).length // store.store holds the actual data
      };
    } catch (error) {
      return { available: false, error: error.message, path: store.path, size: 0 };
    }
  });
} // End of 'else' for expiration check
