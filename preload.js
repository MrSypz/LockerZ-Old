const { contextBridge, webUtils, ipcRenderer } = require('electron');
const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./imagetags.db', (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
    }
});

// Create tables if they don't exist
db.run("CREATE TABLE IF NOT EXISTS images (id INTEGER PRIMARY KEY AUTOINCREMENT, file_name TEXT NOT NULL)", (err) => {
    if (err) {
        console.error('Error creating images table:', err.message);
    }
});

db.run("CREATE TABLE IF NOT EXISTS tags (id INTEGER PRIMARY KEY AUTOINCREMENT, image_id INTEGER, tag TEXT NOT NULL, FOREIGN KEY (image_id) REFERENCES images(id))", (err) => {
    if (err) {
        console.error('Error creating tags table:', err.message);
    }
});


contextBridge.exposeInMainWorld('electron', {
    addTagToImage: (fileName, tag) => {
        return new Promise((resolve, reject) => {
            // First, check if the image exists in the images table
            db.get("SELECT id FROM images WHERE file_name = ?", [fileName], (err, row) => {
                if (err) {
                    return reject('Error querying the image: ' + err.message);
                }

                // If the image doesn't exist, insert it
                if (!row) {
                    db.run("INSERT INTO images (file_name) VALUES (?)", [fileName], function (err) {
                        if (err) {
                            return reject('Error adding image to database: ' + err.message);
                        }
                        const imageId = this.lastID;

                        // Now add the tag to the tags table
                        db.run("INSERT INTO tags (image_id, tag) VALUES (?, ?)", [imageId, tag], (err) => {
                            if (err) {
                                return reject('Error adding tag to image: ' + err.message);
                            }
                            resolve('Tag added successfully!');
                        });
                    });
                } else {
                    // Image exists, add the tag to the tags table
                    const imageId = row.id;
                    db.run("INSERT INTO tags (image_id, tag) VALUES (?, ?)", [imageId, tag], (err) => {
                        if (err) {
                            return reject('Error adding tag to image: ' + err.message);
                        }
                        resolve('Tag added successfully!');
                    });
                }
            });
        });
    },

    // Fetch tags associated with an image
    getTagsForImage: (fileName) => {
        return new Promise((resolve, reject) => {
            db.get("SELECT id FROM images WHERE file_name = ?", [fileName], (err, row) => {
                if (err) {
                    return reject('Error querying the image: ' + err.message);
                }

                if (!row) {
                    return resolve([]);  // No tags if the image is not found
                }

                const imageId = row.id;
                db.all("SELECT tag FROM tags WHERE image_id = ?", [imageId], (err, rows) => {
                    if (err) {
                        return reject('Error fetching tags: ' + err.message);
                    }
                    resolve(rows.map(r => r.tag));
                });
            });
        });
    },
    deleteTagFromImage: (fileName, tag) => {
        return new Promise((resolve, reject) => {
            db.get("SELECT id FROM images WHERE file_name = ?", [fileName], (err, row) => {
                if (err) {
                    return reject('Error querying the image: ' + err.message);
                }

                if (!row) {
                    return reject('Image not found');  // If the image is not found, reject
                }

                const imageId = row.id;

                // Now, delete the tag from the tags table
                db.run("DELETE FROM tags WHERE image_id = ? AND tag = ?", [imageId, tag], function (err) {
                    if (err) {
                        return reject('Error deleting tag: ' + err.message);
                    }

                    if (this.changes > 0) {
                        resolve('Tag deleted successfully');
                    } else {
                        reject('Tag not found for the image');
                    }
                });
            });
        });
    },
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
