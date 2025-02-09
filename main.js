const { app, BrowserWindow, ipcMain } = require('electron');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true, // For simplicity in this demo
      contextIsolation: false,
      enableRemoteModule: true,
    },
    autoHideMenuBar: true,
  });
  mainWindow.loadFile('index.html');
  mainWindow.webContents.openDevTools();
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// IPC handler to simulate typing text into any active window using @nut-tree-fork/nut-js
ipcMain.handle('type-text', async (event, text) => {
  try {
    // Dynamically import nut-js from the fork package.
    const { keyboard } = await import('@nut-tree-fork/nut-js');
    // Set keyboard delay to 0 for maximum speed.
    keyboard.config.autoDelayMs = 0;
    // Type the full text string (Unicode text is supported, so accents are typed correctly)
    await keyboard.type(text);
  } catch (error) {
    console.error('Error simulating typing:', error);
  }
  return true;
});
