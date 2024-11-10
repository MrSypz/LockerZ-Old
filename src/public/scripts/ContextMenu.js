function showContextMenu(event, fileName, isTag, tagkey) {
    event.preventDefault();
    const contextMenu = document.getElementById("context-menu");

    const previousDeleteTagOption = contextMenu.querySelector(".delete-tag-option");
    if (previousDeleteTagOption) {
        previousDeleteTagOption.remove();
    }

    if (!isTag || tagkey == null) {
        const deleteOption = document.getElementById("delete-option");
        const addTagOption = document.getElementById("add-tag-option");
        const moveCategoryOption = document.getElementById("move-category-option");

        deleteOption.onclick = function () {
            deleteImage(fileName);
            contextMenu.classList.remove("active");
        };

        addTagOption.onclick = function () {
            openTagModal(fileName); // Open the modal for adding a tag
            contextMenu.classList.remove("active"); // Hide context menu
        };

        moveCategoryOption.onclick = async function () {
            openMoveCategoryModal(fileName);
            contextMenu.classList.remove("active");
        };

    } else {
        const deleteTagOption = document.createElement("li");
        deleteTagOption.textContent = "Delete Tag";
        deleteTagOption.classList.add("delete-tag-option"); // Add a class for easy selection

        deleteTagOption.onclick = function () {
            deleteTag(fileName, tagkey);
            contextMenu.classList.remove("active");
        };

        contextMenu.querySelector("ul").appendChild(deleteTagOption);
    }

    contextMenu.classList.add("active");

    // Find the image element that was clicked
    const imageElement = event.target.closest('img'); // Assuming the image is clicked directly or wrapped in a parent element

    if (imageElement) {
        // Get the container element
        const container = document.querySelector('.container');
        const containerRect = container.getBoundingClientRect();

        // Get the image position relative to the container
        const imageRect = imageElement.getBoundingClientRect();
        const imageCenterX = imageRect.left + imageRect.width / 2;
        const imageCenterY = imageRect.top + imageRect.height / 2;

        // Calculate the context menu's position to center it on the image within the container
        const menuWidth = contextMenu.offsetWidth;
        const menuHeight = contextMenu.offsetHeight;

        let posX = imageCenterX - containerRect.left - menuWidth / 2; // Center horizontally within container
        let posY = imageCenterY - containerRect.top - menuHeight / 2; // Center vertically within container

        // Prevent the menu from going off the container's bounds
        if (posX + menuWidth > containerRect.width) {
            posX = containerRect.width - menuWidth - 10; // 10px padding from the edge
        }
        if (posX < 10) {
            posX = 10; // Ensure it stays within bounds
        }

        if (posY + menuHeight > containerRect.height) {
            posY = containerRect.height - menuHeight - 10; // 10px padding from the edge
        }
        if (posY < 10) {
            posY = 10; // Ensure it stays within bounds
        }

        // Set the context menu's position relative to the container
        contextMenu.style.left = `${posX}px`;
        contextMenu.style.top = `${posY}px`;
    }

    document.addEventListener(
        "click",
        () => {
            contextMenu.classList.remove("active");
        },
        { once: true }
    );
}
