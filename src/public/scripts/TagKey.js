function addTagToImage(fileName, tag) {
    addTag(fileName, tag)
}

function addTag(fileName, tag) {
    window.electron.addTagToImage(fileName, tag)
        .then(response => {
            loadImages(fileName);
            console.log(response);
        })
        .catch(error => {
            console.error(error);
        });
}
function deleteTag(fileName, tag) {
    window.electron.deleteTagFromImage(fileName, tag)
        .then(response => {
            console.log(response);
            loadImages(fileName);
        })
        .catch(error => {
            console.error(error);
        });
}


function getTags(fileName) {
    window.electron.getTagsForImage(fileName)
        .then(tags => {
            console.log('Tags for image:', tags);
        })
        .catch(error => {
            console.error(error);
        });
}