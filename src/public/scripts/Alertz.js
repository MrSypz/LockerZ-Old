function showLockerZAlert(message) {
    const alertBox = document.getElementById("lockerz-alert");
    const alertMessage = document.getElementById("alert-message");
    const alertOkButton = document.getElementById("alert-ok-button");

    alertMessage.textContent = message;
    alertBox.style.display = "flex";

    alertOkButton.onclick = () => {
        alertBox.style.display = "none";
    };
}
function openTagModal(fileName) {
    const tagModal = document.getElementById("tag-modal");
    const tagInput = document.getElementById("tag-input");
    const tagCloseButton = document.getElementById("close-tag-button");

    tagModal.style.display = "flex";
    document.getElementById("alert-message").textContent = `Add a tag to image: ${fileName}`;

    document.getElementById("save-tag-button").onclick = function () {
        const tag = tagInput.value.trim();

        if (tag) {
            addTagToImage(fileName, tag);
            tagInput.value = '';
            tagModal.style.display = "none";
        }
    };

    tagCloseButton.onclick = () => {
        tagModal.style.display = "none"; //
    };
}

