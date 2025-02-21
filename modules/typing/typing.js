const { clipboard, BrowserWindow } = require('electron'); // Use require in main process

async function simulatePaste(text) {
  // Append a space to the text before pasting
  const textWithSpace = text + ' ';
  clipboard.writeText(textWithSpace);

  // If the current focused window is the typing app, blur it so that paste goes to the underlying app.
  const currentWindow = BrowserWindow.getFocusedWindow();
  if (currentWindow) {
    currentWindow.blur();
  }

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
    throw error; // Re-throw the error so the caller can handle it.
  }
}

module.exports = { simulatePaste };
