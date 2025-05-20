const { ipcMain } = require('electron');
const { translateWithAI } = require('./modules/translation');

// Add test-translation handler
ipcMain.handle('test-translation', async (event, message) => {
  try {
    const translation = await translateWithAI(message, '', '');
    
    if (translation.startsWith("Translation Error:")) {
      return {
        success: false,
        message: translation,
        translation: null
      };
    } else {
      return {
        success: true,
        message: "Translation successful",
        translation: translation
      };
    }
  } catch (error) {
    console.error('Test translation error:', error);
    return {
      success: false,
      message: `Error: ${error.message || 'Unknown error'}`,
      translation: null
    };
  }
});