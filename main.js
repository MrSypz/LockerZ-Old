const { ipcMain, app, BrowserWindow, dialog } = require('electron');
const path = require('path');
const fs = require('fs'); 
const { fork } = require('child_process');
const packageInfo = require('./package.json');  // Load package.json
const axios = require('axios'); // Use axios to communicate with Flask

let mainWindow;
let flaskProcess;

ipcMain.handle('get-version', () => {
    return packageInfo.version;
});

ipcMain.handle('select-folder', async () => {
    const result = await dialog.showOpenDialog({
        properties: ['openDirectory'],
    });

    if (!result.canceled && result.filePaths.length > 0) {
        return result.filePaths[0]; // Return selected folder path
    }
    return null;
});

ipcMain.handle('update-folder-path', async (event, newFolderPath) => {
    try {
        const response = await axios.post('http://localhost:5000/update_folder_path', {
            folder_path: newFolderPath,
        });

        if (response.data.success) {
            // Update the config.json or any persistent storage
            const configPath = path.join(app.getPath('userData'), 'config.json');
            fs.writeFileSync(configPath, JSON.stringify({ folderPath: newFolderPath }));

            return { success: true }; // Return success to the renderer process
        } else {
            return { success: false }; // Return failure if something went wrong
        }
    } catch (error) {
        console.error('Error updating folder path:', error);
        return { success: false };
    }
});

function startFlask() {
    return new Promise((resolve, reject) => {
        flaskProcess = fork(path.join(__dirname, 'flaskWorker.js'));  // Fork the Flask worker process

        flaskProcess.on('message', (message) => {
            if (message.type === 'flask-ready') {
                console.log(message.message);
                resolve(message.message); // Flask is ready, resolve the Promise
            }
            if (message.type === 'flask-output') {
                console.log('Flask output:', message.data);
            }
            if (message.type === 'flask-error') {
                console.error('Flask error:', message.data);
            }
            if (message.type === 'flask-progress') {
                console.log(message.message);
            }
        });

        flaskProcess.on('error', (err) => {
            console.error('Flask process error:', err);
            reject(new Error('Flask process failed to start.'));
        });

        flaskProcess.on('exit', (code) => {
            if (code !== 0) {
                console.error(`Flask worker stopped with exit code ${code}`);
                reject(new Error(`Flask process exited with code ${code}`));
            }
        });
    });
}

function createMainWindow() {
    mainWindow = new BrowserWindow({
        title: 'LockerZ',
        width: 1920,
        height: 1080,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),  // Ensure this path is correct
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false,
        },
        autoHideMenuBar: true,
        icon: path.join(__dirname, 'public', 'resource', 'assets', 'favicon.ico'),
        show: false,
    });

    mainWindow.loadURL('http://localhost:5000');

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();  // Show the window when ready
        // mainWindow.webContents.openDevTools();
    });

    mainWindow.webContents.on('did-finish-load', () => {
        mainWindow.webContents.send('app-version', packageInfo.version);
    });

    mainWindow.webContents.on('context-menu', (e) => {
        e.preventDefault();
    });

    mainWindow.on('closed', () => {
        flaskProcess.send({ type: 'shutdown' });
    });
}

function showLoadingScreen() {
    const loadingWindow = new BrowserWindow({
        width: 400,
        height: 400,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        show: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')  // Add a preload script
        },
    });
    loadingWindow.setIgnoreMouseEvents(true);  // Make the loading screen non-interactive
    loadingWindow.loadFile(path.join(__dirname, 'src', 'public', 'loading.html')); // Load the loading screen
    return loadingWindow;
}

app.whenReady().then(() => {
    // ipcMain.handle('select-folder', async () => {
    //     const result = await dialog.showOpenDialog({
    //         properties: ['openDirectory'],
    //     });
    
    //     if (!result.canceled && result.filePaths.length > 0) {
    //         const selectedFolderPath = result.filePaths[0];
    
    //         // Save the selected folder path to a file (e.g., config.json)
    //         const configPath = path.join(app.getPath('userData'), 'config.json');
    //         fs.writeFileSync(configPath, JSON.stringify({ folderPath: selectedFolderPath }));
    
    //         return selectedFolderPath;  // Return the selected folder path
    //     }
    
    //     return null;  // Return null if no folder was selected or dialog was canceled
    // });

    const loadingWindow = showLoadingScreen();

    startFlask()
        .then(() => {
            loadingWindow.webContents.send('flask-loaded', 'Starting up LockerZ');
            createMainWindow();
            setTimeout(() => {
                loadingWindow.close();
            }, 500);
        })
        .catch((error) => {
            console.error('Error starting Flask:', error);
            loadingWindow.webContents.send('flask-loaded', `Failed to start Flask: ${error.message}`);
            setTimeout(() => {
                loadingWindow.close();
                app.quit();
            }, 1000);
        });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (mainWindow === null) {
        createMainWindow();
    }
});
