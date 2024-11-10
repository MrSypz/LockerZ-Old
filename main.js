const { ipcMain, app, BrowserWindow, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { fork } = require('child_process');
const packageInfo = require('./package.json');  // Load package.json
const axios = require('axios');
const os = require("node:os"); // Use axios to communicate with Flask

const folder_path = getFolderPath();

let mainWindow;
let flaskProcess;
let loadingWindow;

ipcMain.handle('get-version', () => {
    return packageInfo.version;
});
ipcMain.handle('get-category-path', (event, category) => {
    return path.join(folder_path, category);  // Return the full category path
});
ipcMain.handle('get-categories', () => {
    try {
        const categories = [];
        console.log(`Fetching categories from: ${folder_path}`);  // Log folder path
        const files = fs.readdirSync(folder_path);

        files.forEach(name => {
            const dirPath = path.join(folder_path, name);
            if (fs.statSync(dirPath).isDirectory()) {
                categories.push(name);
            }
        });

        console.log('Categories found:', categories);  // Log the categories found
        return categories;  // Return the categories as an array
    } catch (e) {
        console.error('Error fetching categories:', e);
        return [];  // Return an empty array in case of error
    }
});

ipcMain.handle('move-file', async (event, { filePath, newCategoryPath, fileName }) => {
    const destinationPath = path.join(newCategoryPath, fileName);
    const cfilePath = path.join(filePath,fileName);
    console.log("Moving file:");
    console.log("File Path:", cfilePath);
    console.log("Destination Path:", destinationPath);

    try {
        // Ensure destination folder exists, create it if it doesn't
        if (!fs.existsSync(newCategoryPath)) {
            fs.mkdirSync(newCategoryPath, { recursive: true });
            console.log(`Created new category folder at: ${newCategoryPath}`);
        }

        // Move the file from the current category path to the new category path
        fs.renameSync(cfilePath, destinationPath);
        console.log(`File moved from ${cfilePath} to ${destinationPath}`);
        return true;  // Success
    } catch (error) {
        console.error('Error moving file:', error);
        return false;  // Error
    }
});

ipcMain.handle('serve-file', (event, category, filename) => {
    const categoryPath = path.join(folder_path, category);
    const filePath = path.join(categoryPath, filename);

    if (fs.existsSync(filePath)) {
        return filePath;
    } else {
        return null;
    }
});

ipcMain.handle('get-images', (event, category) => {
    const categoryPath = path.join(folder_path, category);

    try {
        const images = fs.readdirSync(categoryPath).filter(file => {
            const extname = path.extname(file).toLowerCase();
            return extname === '.jpg' || extname === '.png' || extname === '.jpeg' || extname ==='.jfif';  // Filter image files
        });

        return { images }; // Return the list of image filenames
    } catch (err) {
        console.error('Error fetching images:', err);
        return { error: 'Failed to load images' };
    }
});

ipcMain.on('sendFilePaths', (event, { filePaths, categoryPath, selectedCategory }) => {
    console.log('Received file paths:', filePaths);
    console.log('Selected category path:', categoryPath);
    console.log('Selected category as:', selectedCategory);

    filePaths.forEach(filePath => {
        const fileName = path.basename(filePath);
        const destinationPath = path.join(categoryPath, selectedCategory, fileName);

        try {
            // Ensure the category folder exists
            if (!fs.existsSync(categoryPath)) {
                fs.mkdirSync(categoryPath, { recursive: true });
                console.log(`Created category folder: ${categoryPath}`);
            }

            // Move file to the category folder
            fs.rename(filePath, destinationPath, (err) => {
                if (err) {
                    console.error('Error moving file:', err);
                } else {
                    console.log('File moved successfully:', fileName);
                }
            });

        } catch (error) {
            console.error('Failed to move file:', error);
        }
    });
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

ipcMain.on('file-drop', (event, { filePaths, categoryName, categoryPath }) => {
    console.log('Received file paths:', filePaths);
    console.log('Selected category name:', categoryName);
    console.log('Selected category path:', categoryPath);
    const amount = filePaths.length;
    filePaths.forEach(filePath => {
        const fileName = path.basename(filePath);
        const destinationPath = path.join(categoryPath, categoryName, fileName);

        try {
            if (!fs.existsSync(categoryPath)) {
                fs.mkdirSync(categoryPath, { recursive: true });
                console.log(`Created folder: ${categoryPath}`);
            }

            fs.copyFile(filePath, destinationPath, (err) => {
                if (err) {
                    console.error('Error copying file:', err);
                } else {
                    fs.unlink(filePath, (err) => {
                        if (err) {
                            console.error('Error deleting original file:', err);
                        } else {
                            console.log('Original file deleted after copy');
                        }
                    });
                    console.log('File copied successfully:', fileName);
                }
            });
        } catch (error) {
            console.error('Failed to copy file:', error);
        }
    });
    amount > 1 ? event.reply('file-upload-complete', { success: true, message: `All ${amount} files uploaded successfully` }) : event.reply('file-upload-complete', { success: true, message: `${amount} file uploaded successfully` })
});


ipcMain.handle('update-folder-path', async (event, newFolderPath) => {
    try {
        const response = await axios.post('http://localhost:5000/update_folder_path', {
            folder_path: newFolderPath,
        });

        if (response.data.success) {
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


function getFolderPath() {
    try {
        const configPath = path.join(os.homedir(), 'AppData', 'Roaming', 'lockerz', 'config.json');
        if (fs.existsSync(configPath)) {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
            return config.folderPath || path.join(os.homedir(), 'LockerZ');  // Default path if not found
        }
        return path.join(os.homedir(), 'LockerZ');  // Fallback if config is missing
    } catch (e) {
        console.error('Error reading config:', e);
        return path.join(os.homedir(), 'LockerZ');  // Fallback path if reading the config fails
    }
}

function startFlask() {
    return new Promise((resolve, reject) => {
        flaskProcess = fork(path.join(__dirname, 'flaskWorker.js'));  // Fork the Flask worker process

        flaskProcess.on('message', (message) => {
            if (message.type === 'flask-ready') {
                console.log(message.message);
                resolve(message.message); // Flask is ready, resolve the Promise
                loadingWindow.webContents.send('flask-loaded', 'Flask is ready!');  // Send readiness message
            }
            if (message.type === 'flask-output') {
                console.log('Flask output:', message.data);
                loadingWindow.webContents.send('flask-loaded', message.data);  // Send Flask output to the loading window
            }
            if (message.type === 'flask-error') {
                console.error('Flask error:', message.data);
                // loadingWindow.webContents.send('flask-loaded', `Flask error: ${message.data}`);  // Send error message
            }
            if (message.type === 'flask-progress') {
                console.log(message.message);
                loadingWindow.webContents.send('flask-loaded', message.message);  // Send progress update to the loading window
            }
        });

        flaskProcess.on('error', (err) => {
            console.error('Flask process error:', err);
            reject(new Error('Flask process failed to start.'));
            loadingWindow.webContents.send('flask-loaded', `Flask process error: ${err.message}`);  // Send error to loading window
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
            nodeIntegration: true,
            enableRemoteModule: true,
            webSecurity: false
            // devTools: false
        },
        autoHideMenuBar: true,
        icon: path.join(__dirname, 'public', 'resource', 'assets', 'favicon.ico'),
        show: false,
    });

    mainWindow.loadURL('http://localhost:5000');

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();  // Show the window when ready
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
    loadingWindow = new BrowserWindow({
        width: 400,
        height: 400,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        show: true,
        webPreferences: {
            nodeIntegration: true,
            devTools: false,
            preload: path.join(__dirname, 'preload.js')  // Add a preload script
        },
    });
    loadingWindow.setIgnoreMouseEvents(true);  // Make the loading screen non-interactive
    loadingWindow.loadFile(path.join(__dirname, 'src', 'public', 'loading.html')); // Load the loading screen
    return loadingWindow;
}

app.on('ready',() => {
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
