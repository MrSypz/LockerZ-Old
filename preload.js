const { contextBridge, webUtils, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    onFlaskLoaded: (callback) => ipcRenderer.on('flask-loaded', (event, message) => callback(message)),
    getVersion: () => ipcRenderer.invoke('get-version'),
    selectFolder: () => ipcRenderer.invoke('select-folder'),
    updateFolderPath: (newFolderPath) => ipcRenderer.invoke('update-folder-path', newFolderPath),
    getFilePath(file) {
        return webUtils.getPathForFile(file);  // Using webUtils to get the file path
    },
    getCategoryPath: async () => {
        try {
            const response = await fetch('http://localhost:5000/get_folder_path');  // Make sure Flask is running at this address
            const data = await response.json();
            return data.folderPath;  // Return the folder path
        } catch (error) {
            console.error("Error fetching folder path:", error);
            return null;
        }
    },
    sendFilePaths: (filePaths) => ipcRenderer.send('file-drop', filePaths),
    onFileUploadComplete: (callback) => {
        ipcRenderer.on('file-upload-complete', (event, data) => {
            callback(data);  // Trigger the callback with the data received
        });
    },
});
