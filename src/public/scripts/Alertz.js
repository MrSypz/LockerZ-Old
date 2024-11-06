function showLockerZAlert(message) {
    const alertBox = document.getElementById("lockerz-alert");
    const alertMessage = document.getElementById("alert-message");
    const alertOkButton = document.getElementById("alert-ok-button");

    alertMessage.textContent = message;
    alertBox.style.display = "flex";

    alertOkButton.onclick = () => {
        alertBox.style.display = "none";
        document.getElementById("new-category").focus(); // Return focus to the input
    };
}

