const { ipcRenderer } = require('electron');

document.addEventListener('DOMContentLoaded', () => {
  // Wait briefly to ensure all content is rendered.
  setTimeout(() => {
    const contentHeight = document.documentElement.scrollHeight;
    ipcRenderer.send('resize-settings-window', contentHeight);
  }, 100);
});
