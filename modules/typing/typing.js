const { clipboard } = require('electron'); // Use require in main process

async function simulatePaste(text) {
    // Append a space to the text before pasting
    const textWithSpace = text + ' '; // <--- ADD SPACE HERE
    clipboard.writeText(textWithSpace);
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

module.exports = {
    simulatePaste
};
