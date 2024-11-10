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

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const menuWidth = contextMenu.offsetWidth;
    const menuHeight = contextMenu.offsetHeight;

    let posX = event.pageX;
    let posY = event.pageY;

    if (posX + menuWidth > viewportWidth) {
        posX = viewportWidth - menuWidth - 10; // 10px padding from the edge
    }

    if (posY + menuHeight > viewportHeight) {
        posY = viewportHeight - menuHeight - 10; // 10px padding from the edge
    }

    contextMenu.style.left = `${posX}px`;
    contextMenu.style.top = `${posY}px`;

    document.addEventListener(
        "click",
        () => {
            contextMenu.classList.remove("active");
        },
        { once: true }
    );
}
