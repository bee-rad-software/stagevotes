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
let stageWindow = null;
let stageRestoreBounds = null;

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

  hostWindow.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const parsed = new URL(url);
      const match = parsed.pathname.match(/^\/stage-display\/([0-9a-f-]{36})\/?$/i);
      if (parsed.origin === new URL(BASE_URL).origin && match) {
        createStageWindow(match[1]);
        return { action: "deny" };
      }
    } catch {}
    return { action: "allow" };
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


function isStageUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.origin === new URL(BASE_URL).origin &&
      /^\/stage-display\/[0-9a-f-]{36}\/?$/i.test(parsed.pathname);
  } catch { return false; }
}

function isStageSender(event) {
  return stageWindow && !stageWindow.isDestroyed() &&
    event.sender === stageWindow.webContents &&
    event.senderFrame === stageWindow.webContents.mainFrame &&
    isStageUrl(event.senderFrame.url);
}

function createStageWindow(eventId) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(eventId)) return;
  if (stageWindow && !stageWindow.isDestroyed()) {
    stageWindow.loadURL(BASE_URL + "/stage-display/" + eventId);
    stageWindow.show(); stageWindow.focus(); return stageWindow;
  }
  const saved = loadWindowState()?.stage;
  const area = screen.getPrimaryDisplay().workArea;
  const bounds = isBoundsVisible(saved) ? saved : {
    x: area.x + 40, y: area.y + 40,
    width: Math.min(1200, area.width - 80), height: Math.min(760, area.height - 80)
  };
  stageRestoreBounds = null;
  stageWindow = new BrowserWindow({
    ...bounds, minWidth: 640, minHeight: 400,
    title: "StageVotes Stage Mode", frame: false,
    resizable: true, movable: true, minimizable: true,
    maximizable: false, fullscreenable: false, hasShadow: false,
    backgroundColor: "#03060e",
    webPreferences: { contextIsolation: true, nodeIntegration: false,
      preload: path.join(__dirname, "electron-preload.js") }
  });
  // Never make the backdrop always-on-top: KaraFun must remain above it.
  stageWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  stageWindow.webContents.on("will-navigate", (event, url) => {
    if (!isStageUrl(url)) event.preventDefault();
  });
  const save = () => {
    if (!stageWindow || stageWindow.isDestroyed() || stageRestoreBounds) return;
    saveWindowState({ ...(loadWindowState() || {}), stage: stageWindow.getBounds() });
  };
  stageWindow.on("move", save); stageWindow.on("resize", save);
  stageWindow.on("closed", () => { stageWindow = null; stageRestoreBounds = null; });
  stageWindow.loadURL(BASE_URL + "/stage-display/" + eventId);
  return stageWindow;
}

function restoreStageWindow() {
  if (!stageWindow || stageWindow.isDestroyed()) return;
  if (stageRestoreBounds) {
    const bounds = stageRestoreBounds;
    stageRestoreBounds = null;
    const area = screen.getPrimaryDisplay().workArea;
    stageWindow.setBounds(isBoundsVisible(bounds) ? bounds : {
      x: area.x + 40, y: area.y + 40,
      width: Math.min(1200, area.width - 80), height: Math.min(760, area.height - 80)
    });
  }
}

app.whenReady().then(() => {
  ipcMain.handle("stage-fill-tv", (event, displayId) => {
    if (!isStageSender(event)) return null;
    const displays = screen.getAllDisplays();
    const target = displays.find(display => String(display.id) === String(displayId)) ||
      screen.getDisplayMatching(stageWindow.getBounds());
    if (!stageRestoreBounds) stageRestoreBounds = stageWindow.getBounds();
    stageWindow.setBounds(target.bounds);
    return { filled: true };
  });
  ipcMain.handle("stage-restore-window", event => {
    if (!isStageSender(event)) return null;
    restoreStageWindow(); return { filled: false };
  });
  ipcMain.handle("stage-list-displays", event => {
    if (!isStageSender(event)) return null;
    const current = screen.getDisplayMatching(stageWindow.getBounds());
    return { filled: Boolean(stageRestoreBounds), displays: screen.getAllDisplays().map((display, index) => ({
      id: String(display.id), label: display.label || "Display " + (index + 1),
      width: display.bounds.width, height: display.bounds.height, current: display.id === current.id
    })) };
  });
  ipcMain.handle("stage-close-window", event => {
    if (!isStageSender(event)) return false;
    stageWindow.close(); return true;
  });
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