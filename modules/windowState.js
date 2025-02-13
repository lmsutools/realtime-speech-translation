const { screen } = require('electron');

/**
 * restoreWindowState(store, storeKey, defaults)
 * Reads x, y, width, height from electron-store. If none found or invalid,
 * fallback to defaults. If the position is off-screen, fallback to letting
 * Electron auto-center (x,y = undefined).
 */
function restoreWindowState(store, storeKey, defaults = {}) {
  // Retrieve from store, e.g. { x, y, width, height }
  const saved = store.get(storeKey, {});

  // Validate numeric width/height
  let width = (typeof saved.width === 'number') ? saved.width : (defaults.width || 800);
  let height = (typeof saved.height === 'number') ? saved.height : (defaults.height || 600);

  // Validate numeric x/y. If not valid, set them undefined so Electron will auto-position.
  let x = (typeof saved.x === 'number') ? saved.x : undefined;
  let y = (typeof saved.y === 'number') ? saved.y : undefined;

  // If x,y are valid numbers, check if off-screen:
  if (typeof x === 'number' && typeof y === 'number') {
    const display = screen.getDisplayMatching({ x, y, width, height });
    const { bounds } = display;
    const withinHorizontal = x >= bounds.x && (x + width) <= (bounds.x + bounds.width);
    const withinVertical = y >= bounds.y && (y + height) <= (bounds.y + bounds.height);

    // If the window is off-screen, fallback to undefined
    if (!withinHorizontal || !withinVertical) {
      x = undefined;
      y = undefined;
    }
  }

  return { x, y, width, height };
}

/**
 * saveWindowState(store, storeKey, browserWindow)
 * Monitors the window for move/resize events and saves
 * x, y, width, height to electron-store on close or changes.
 */
function saveWindowState(store, storeKey, browserWindow) {
  function updateState() {
    if (!browserWindow.isDestroyed()) {
      const bounds = browserWindow.getBounds();
      store.set(storeKey, {
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height
      });
    }
  }

  browserWindow.on('moved', updateState);
  browserWindow.on('resize', updateState);
  browserWindow.on('close', updateState);
}

module.exports = {
  restoreWindowState,
  saveWindowState
};
