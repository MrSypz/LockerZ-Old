document.getElementById('select-folder-btn').addEventListener('click', async () => {
    const folderPath = await window.electron.selectFolder();  // Using the preload method

    if (folderPath) {
        document.getElementById('folder-path').innerText = `Selected folder: ${folderPath}`;
        document.getElementById('apply-folder-btn').style.display = 'inline-block';  // Show Apply Button
        document.getElementById('folder-not-selected').style.display = 'none';  // Hide the "No folder selected" message
    }
});

document.getElementById('apply-folder-btn').addEventListener('click', async () => {
    const newFolderPath = document.getElementById('folder-path').innerText.replace('Selected folder: ', '');

    const response = await window.electron.updateFolderPath(newFolderPath);

    if (response.success) {
        showLockerZAlert('Folder path updated successfully!');
        document.getElementById('apply-folder-btn').style.display = 'none'; // Hide Apply Button
        location.reload();
    } else {
        showLockerZAlert('Error updating folder path.');
    }
});
