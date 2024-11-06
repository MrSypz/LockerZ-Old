const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    onFlaskLoaded: (callback) => ipcRenderer.on('flask-loaded', (event, message) => callback(message)),
    getVersion: () => ipcRenderer.invoke('get-version'),
    selectFolder: () => ipcRenderer.invoke('select-folder'),
    updateFolderPath: (newFolderPath) => ipcRenderer.invoke('update-folder-path', newFolderPath),  // Method to update the folder path
});
