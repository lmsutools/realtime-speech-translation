const { screen } = require('electron');

/*** Calculate the intersection area between two rectangles.
 * Rectangles must be in form { x, y, width, height }.
 */
function getIntersectionArea(r1, r2) {
    const x1 = Math.max(r1.x, r2.x);
    const y1 = Math.max(r1.y, r2.y);
    const x2 = Math.min(r1.x + r1.width, r2.x + r2.width);
    const y2 = Math.min(r1.y + r1.height, r2.y + r2.height);
    const intersectionWidth = x2 - x1;
    const intersectionHeight = y2 - y1;

    if (intersectionWidth > 0 && intersectionHeight > 0) {
        return intersectionWidth * intersectionHeight;
    }
    return 0;
}

/*** restoreWindowState(store, storeKey, defaults, initialSizes)* Reads x, y, width, height from electron-store. If none found or invalid,
 * fallback to defaults. Intersects with available displays. If no intersection,
 * center on primary display. Returns { x, y, width, height } for useContentSize.
 * Includes initialSizes for first-time app launch.
 */
function restoreWindowState(store, storeKey, defaults = {}, initialSizes = {}) { // Added initialSizes parameter
    let saved = store.get(storeKey, {});
    console.log(`[restoreWindowState] storeKey: ${storeKey}, Saved state:`, saved);

    let width = typeof saved.width === 'number' ? saved.width : (defaults.width || 800);
    let height = typeof saved.height === 'number' ? saved.height : (defaults.height || 600);
    let x = typeof saved.x === 'number' ? saved.x : undefined;
    let y = typeof saved.y === 'number' ? saved.y : undefined;

    // Check if there is a saved state. If not, use initial sizes if provided.
    if (Object.keys(saved).length === 0 && initialSizes && initialSizes.width && initialSizes.height) { // Check if saved is empty
        width = initialSizes.width;
        height = initialSizes.height;
        x = undefined; // Let Electron auto-position if it's the very first time
        y = undefined;
        console.log(`[restoreWindowState] No saved state found, using initial sizes.`);
    }


    // If no valid saved position, return defaults. Electron will auto-position.
    if (x === undefined || y === undefined) {
        console.log(`[restoreWindowState] No valid saved position (or first launch defaults), using defaults.`);
        return { x, y, width, height };
    }

    const windowBounds = { x, y, width, height };
    const displays = screen.getAllDisplays();
    let bestDisplay = null;
    let bestArea = 0;

    for (const display of displays) {
        const area = getIntersectionArea(windowBounds, display.workArea);
        if (area > bestArea) {
            bestArea = area;
            bestDisplay = display;
        }
    }

    if (!bestDisplay || bestArea === 0) {
        const primary = screen.getPrimaryDisplay().workArea;
        x = primary.x + Math.round((primary.width - width) / 2);
        y = primary.y + Math.round((primary.height - height) / 2);
        console.log(`[restoreWindowState] No display intersection, centering on primary.`);
        return { x, y, width, height };
    }

    const wa = bestDisplay.workArea;
    if (width > wa.width) width = wa.width;
    if (height > wa.height) height = wa.height;
    if (x < wa.x) x = wa.x;
    if (y < wa.y) y = wa.y;
    if (x + width > wa.x + wa.width) x = wa.x + wa.width - width;
    if (y + height > wa.y + wa.height) y = wa.y + wa.height - height;

    console.log(`[restoreWindowState] Restored state: { x: ${x}, y: ${y}, width: ${width}, height: ${height} }`);
    return { x, y, width, height };
}

function saveWindowState(store, storeKey, browserWindow) {
    function updateState() {
        if (!browserWindow.isDestroyed()) {
            const normalBounds = browserWindow.getBounds();
            console.log(`[saveWindowState] storeKey: ${storeKey}, Saving state:`, normalBounds);
            store.set(storeKey, {
                x: normalBounds.x,
                y: normalBounds.y,
                width: normalBounds.width,
                height: normalBounds.height,
            });
        }
    }
    browserWindow.on('moved', updateState);
    browserWindow.on('resize', updateState);
    browserWindow.on('close', updateState);
}

module.exports = { restoreWindowState, saveWindowState };
