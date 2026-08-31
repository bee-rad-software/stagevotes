const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("stagevotesDesktop", {
  toggleKarafunDisplay: (eventId) => {
  ipcRenderer.send(
    "toggle-karafun-display",
    eventId
  );
},

  getKarafunDisplayState: () => {
    return ipcRenderer.invoke("get-karafun-display-state");
  },

  onKarafunDisplayState: (callback) => {
    const handler = (_event, isOpen) => {
      callback(isOpen);
    };

    ipcRenderer.on(
      "karafun-display-state",
      handler
    );

    return () => {
      ipcRenderer.removeListener(
        "karafun-display-state",
        handler
      );
    };
  },
});