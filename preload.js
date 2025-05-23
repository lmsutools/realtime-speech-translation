const { contextBridge, ipcRenderer } = require('electron');
const remote = require('@electron/remote'); // For specific, controlled exposure

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object.
contextBridge.exposeInMainWorld('electronAPI', {
  // IPC Renderer
  send: (channel, data) => ipcRenderer.send(channel, data),
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
  on: (channel, func) => {
    // Deliberately strip event as it includes `sender`
    const subscription = (event, ...args) => func(...args);
    ipcRenderer.on(channel, subscription);
    // Return a cleanup function
    return () => ipcRenderer.removeListener(channel, subscription);
  },
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),

  // @electron/remote (use with extreme caution - prefer IPC for most things)
  // Only expose what is absolutely necessary from remote.
  // For example, if you need dialogs from renderer:
  getRemoteDialog: () => remote.dialog,
  // If you need to get a global from main process (less safe, try to avoid)
  // getGlobal: (name) => remote.getGlobal(name),

  // Example: If you need to access app version from renderer
  getAppVersion: () => remote.app.getVersion(),

  // Add other specific remote modules or properties if essential,
  // but always prefer IPC for actions and data transfer.
  // e.g., if your renderer truly needs to know the platform:
  getPlatform: () => process.platform, // process.platform is safe to expose

  // Expose MobX appState if needed directly (though usually updated via IPC)
  // This would require appState to be gettable via remote.getGlobal or a dedicated IPC.
  // For now, assume appState is managed via IPC messages like 'update-app-state'.
});

console.log('[Preload] electronAPI exposed to renderer.');
