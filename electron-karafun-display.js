const { app, BrowserWindow, screen } = require("electron");

const DISPLAY_WIDTH = 430;

function getEventId() {
  const eventId = process.argv[2];

  if (!eventId) {
    console.error("Missing StageVotes event ID");
    return null;
  }

  return eventId;
}

function createHostWindow(eventId) {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { x, y, width, height } = primaryDisplay.workArea;

  const hostWidth = width - DISPLAY_WIDTH;

  const hostWindow = new BrowserWindow({
    width: hostWidth,
    height,
    x,
    y,

    // For now, leave the Host window framed.
    // We'll make this feel more app-like after the structure works.
    frame: true,

    resizable: true,
    movable: true,
    minimizable: true,
    maximizable: true,
    fullscreenable: false,

    backgroundColor: "#020617",

    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  hostWindow.loadURL(
    `http://localhost:3000/host/${eventId}`
  );

  return hostWindow;
}

function createCompanionWindow(eventId) {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { x, y, width, height } = primaryDisplay.workArea;

  const companionWindow = new BrowserWindow({
    width: DISPLAY_WIDTH,
    height,
    x: x + width - DISPLAY_WIDTH,
    y,

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

  companionWindow.loadURL(
    `http://localhost:3000/karafun-display/${eventId}`
  );

  return companionWindow;
}

app.whenReady().then(() => {
  const eventId = getEventId();

  if (!eventId) {
    app.quit();
    return;
  }

  createHostWindow(eventId);
  createCompanionWindow(eventId);

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createHostWindow(eventId);
      createCompanionWindow(eventId);
    }
  });
});

app.on("window-all-closed", () => {
  app.quit();
});