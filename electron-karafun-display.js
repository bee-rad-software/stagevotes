const {
  app,
  BrowserWindow,
  screen,
  ipcMain,
  Menu,
} = require("electron");
const path = require("path");
const fs = require("fs");
const BASE_URL = app.isPackaged
  ? "https://app.stagevotes.com"
  : "http://localhost:3000";

app.setName("StageVotes Host");

if (process.platform === "win32") {
  Menu.setApplicationMenu(null);
}

const DISPLAY_WIDTH = 430;

let hostWindow = null;
let companionWindow = null;

function getWindowStatePath() {
  return path.join(
    app.getPath("userData"),
    "window-state.json"
  );
}

function loadWindowState() {
  try {
    const statePath =
      getWindowStatePath();

    if (!fs.existsSync(statePath)) {
      return null;
    }

    return JSON.parse(
      fs.readFileSync(statePath, "utf8")
    );
  } catch (error) {
    console.error(
      "Could not load window state:",
      error
    );

    return null;
  }
}

function isBoundsVisible(bounds) {
  if (!bounds) {
    return false;
  }

  const displays = screen.getAllDisplays();

  return displays.some((display) => {
    const area = display.workArea;

    const horizontalOverlap =
      bounds.x < area.x + area.width &&
      bounds.x + bounds.width > area.x;

    const verticalOverlap =
      bounds.y < area.y + area.height &&
      bounds.y + bounds.height > area.y;

    return horizontalOverlap && verticalOverlap;
  });
}

function saveWindowState(state) {
  try {
    fs.writeFileSync(
      getWindowStatePath(),
      JSON.stringify(state, null, 2)
    );
  } catch (error) {
    console.error(
      "Could not save window state:",
      error
    );
  }
}

function createHostWindow() {
  const savedState =
  loadWindowState()?.host;

const usableSavedState =
  isBoundsVisible(savedState)
    ? savedState
    : null;

  hostWindow = new BrowserWindow({
    width:
  usableSavedState?.width || 1280,

height:
  usableSavedState?.height || 900,

x:
  usableSavedState?.x,

y:
  usableSavedState?.y,

    title: "StageVotes Host",

    titleBarStyle:
  process.platform === "darwin"
    ? "hiddenInset"
    : "hidden",

    titleBarOverlay:
  process.platform === "win32"
    ? {
        height: 48,
        color: "#0b0f19",
        symbolColor: "#ffffff",
      }
    : false,

    trafficLightPosition: {
      x: 16,
      y: 16,
    },

    resizable: true,
    movable: true,
    minimizable: true,
    maximizable: true,
    fullscreenable: false,

    backgroundColor: "#020617",

    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(
        __dirname,
        "electron-preload.js"
      ),
    },
  });

  hostWindow.loadURL(BASE_URL);

  const saveHostBounds = () => {
  if (
    !hostWindow ||
    hostWindow.isDestroyed() ||
    hostWindow.isMaximized()
  ) {
    return;
  }

  const bounds =
    hostWindow.getBounds();

  const existing =
    loadWindowState() || {};

  saveWindowState({
    ...existing,
    host: bounds,
  });
};

hostWindow.on(
  "resize",
  saveHostBounds
);

hostWindow.on(
  "move",
  saveHostBounds
);

  hostWindow.on("closed", () => {
    hostWindow = null;
  });

  return hostWindow;
}

function createCompanionWindow(eventId) {
  if (
    companionWindow &&
    !companionWindow.isDestroyed()
  ) {
    companionWindow.focus();
    return companionWindow;
  }

  const savedState =
  loadWindowState()?.companion;

  const usableSavedState =
  isBoundsVisible(savedState)
    ? savedState
    : null;

  const primaryDisplay =
    screen.getPrimaryDisplay();

  const {
    x,
    y,
    width,
    height,
  } = primaryDisplay.workArea;

  companionWindow = new BrowserWindow({
    width:
  usableSavedState?.width || DISPLAY_WIDTH,

height:
  usableSavedState?.height || height,

minHeight: 720,

x:
  usableSavedState?.x ??
  x + width - DISPLAY_WIDTH,

y:
  usableSavedState?.y ?? y,

    frame: false,

    resizable: true,
    movable: true,
    minimizable: true,
    maximizable: false,
    fullscreenable: false,

    backgroundColor: "#020617",

    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const saveCompanionBounds = () => {
  if (
    !companionWindow ||
    companionWindow.isDestroyed()
  ) {
    return;
  }

  const bounds =
    companionWindow.getBounds();

  const existing =
    loadWindowState() || {};

  saveWindowState({
    ...existing,
    companion: bounds,
  });
};

companionWindow.on(
  "resize",
  saveCompanionBounds
);

companionWindow.on(
  "move",
  saveCompanionBounds
);

  companionWindow.loadURL(
  `${BASE_URL}/karafun-display/${eventId}`
);

  if (
    hostWindow &&
    !hostWindow.isDestroyed()
  ) {
    hostWindow.webContents.send(
      "karafun-display-state",
      true
    );
  }

  companionWindow.on("closed", () => {
    companionWindow = null;

    if (
      hostWindow &&
      !hostWindow.isDestroyed()
    ) {
      hostWindow.webContents.send(
        "karafun-display-state",
        false
      );
    }
  });

  return companionWindow;
}

app.whenReady().then(() => {
  if (process.platform === "darwin") {
    app.dock.setIcon(
      path.join(
        __dirname,
        "public",
        "icon-512.png"
      )
    );
  }

  ipcMain.on(
    "toggle-karafun-display",
    (_event, requestedEventId) => {
      if (
        companionWindow &&
        !companionWindow.isDestroyed()
      ) {
        companionWindow.close();
        return;
      }

      if (!requestedEventId) {
        console.error(
          "Cannot open KaraFun display without an event ID."
        );
        return;
      }

      createCompanionWindow(
        requestedEventId
      );
    }
  );

  ipcMain.handle(
    "get-karafun-display-state",
    () => {
      return Boolean(
        companionWindow &&
        !companionWindow.isDestroyed()
      );
    }
  );

  createHostWindow();

  app.on("activate", () => {
    if (
      !hostWindow ||
      hostWindow.isDestroyed()
    ) {
      createHostWindow();
    }
  });
});

app.on("window-all-closed", () => {
  app.quit();
});