const uploadedImages = new Set();

async function populateCategorySelector() {
    const categorySelect = document.getElementById("category");

    const startTime = performance.now();

    try {
        // Await the promise from the main process
        const categories = await window.electron.getCategories();
        categorySelect.innerHTML = ''; // Clear existing options

        if (categories && categories.length > 0) {
            categories.forEach(category => {
                let option = document.createElement("option");
                option.value = category;
                option.textContent = category;
                categorySelect.appendChild(option);
            });

            const lastSelectedCategory = localStorage.getItem('lastSelectedCategory');

            if (lastSelectedCategory && categories.includes(lastSelectedCategory)) {
                categorySelect.value = lastSelectedCategory;
            } else {
                categorySelect.value = categories[0];
            }
        } else {
            let option = document.createElement("option");
            option.value = '';
            option.textContent = 'No categories found';
            option.disabled = true;
            categorySelect.appendChild(option);
        }

        updateCategory();

        // End timing the operation
        const endTime = performance.now();
        const duration = endTime - startTime;
        console.log(`Electron local fs access took ${duration.toFixed(2)} ms`);

    } catch (err) {
        console.error('Error fetching categories:', err);
    }
}
function updateCategory() {
    const categorySelect = document.getElementById("category");
    const selectedCategory = categorySelect.value;

    localStorage.setItem('lastSelectedCategory', selectedCategory);

    loadImages();
}

async function openMoveCategoryModal(fileName) {
    const moveCategoryModal = document.getElementById("move-category");
    const categoryDropdown = document.getElementById("category_id");

    // Fetch all categories to populate the dropdown
    const categories = await window.electron.getCategories();
    categoryDropdown.innerHTML = ''; // Clear previous options

    // Populate dropdown with categories
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        categoryDropdown.appendChild(option);
    });

    // Show the Move Category modal
    moveCategoryModal.style.display = 'flex';

    // Handle Move Confirm button click
    document.getElementById("move-confirm-button").onclick = async function () {
        const selectedCategory = categoryDropdown.value;  // Get selected category

        const newCategoryPath = await window.electron.getCategoryPath(selectedCategory);
        const currentCategory = await window.electron.getCategoryPath(localStorage.getItem('lastSelectedCategory'));

        console.log(`Moving file: ${fileName} from ${currentCategory} to ${newCategoryPath}`);

        await window.electron.moveFile({
            filePath: currentCategory,
            newCategoryPath: newCategoryPath,
            fileName: fileName
        });

        moveCategoryModal.style.display = 'none';  // Close the modal
        loadImages();
    };
    document.getElementById("move-cancel-button").onclick = function () {
        moveCategoryModal.style.display = 'none';
    };
}


let categoryToDelete = null;  // To store the category that the user intends to delete
// Only use in category.html
async function displayCategories() {
    const categoryList = document.getElementById("category-list");
    const editCategoryModal = document.getElementById("edit-category-modal");
    const editCategoryInput = document.getElementById("edit-category-input");
    const submitEditButton = document.getElementById("submit-edit");
    const cancelEditButton = document.getElementById("cancel-edit");
    const confirmModal = document.getElementById("confirm-modal");
    const submitConfirmButton = document.getElementById("submit-confirm");
    const cancelConfirmButton = document.getElementById("cancel-confirm");

    try {
        // Await the result of window.electron.getCategories()
        const categories = await window.electron.getCategories();
        categoryList.innerHTML = '';

        categories.forEach(category => {
            const listItem = document.createElement("li");
            listItem.textContent = category;

            // Create Edit button
            const editButton = document.createElement("button");
            editButton.textContent = "Edit";
            editButton.classList.add("custom-button");
            editButton.onclick = () => {
                editCategoryInput.value = category;
                editCategoryInput.dataset.oldCategory = category;
                editCategoryModal.style.display = "flex";
            };

            listItem.appendChild(editButton);

            const deleteButton = document.createElement("button");
            deleteButton.textContent = "Delete";
            deleteButton.classList.add("custom-button", "delete-button");
            deleteButton.onclick = () => {
                categoryToDelete = category;
                confirmModal.style.display = "flex";
            };
            listItem.appendChild(deleteButton);

            categoryList.appendChild(listItem);
        });
    } catch (err) {
        console.error('Error fetching categories:', err);
    }

    // Edit button functionality
    submitEditButton.addEventListener("click", () => {
        const newCategoryName = editCategoryInput.value.trim();
        const oldCategoryName = editCategoryInput.dataset.oldCategory.trim();

        if (newCategoryName && newCategoryName !== oldCategoryName) {
            editCategory(oldCategoryName, newCategoryName);
            editCategoryModal.style.display = "none";
        } else {
            showLockerZAlert("Please enter a new category name.");
        }
    });

    cancelEditButton.addEventListener("click", () => {
        editCategoryModal.style.display = "none";
    });

    // Confirm deletion button functionality
    submitConfirmButton.addEventListener("click", () => {
        if (categoryToDelete) {
            deleteCategory(categoryToDelete);
            confirmModal.style.display = "none";
        }
    });

    cancelConfirmButton.addEventListener("click", () => {
        confirmModal.style.display = "none";
    });
}

// Only use in category.html
function editCategory(oldCategory, newCategory) {
    fetch('/rename_category', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            oldCategory: oldCategory,
            newCategory: newCategory
        })
    })
        .then(response => {
            if (response.ok) {
                displayCategories(); // Refresh the category list after renaming
            } else {
                showLockerZAlert("Failed to rename category.");
            }
        })
        .catch(err => console.error("Error renaming category: ", err));
}

// Only use in category.html
function deleteCategory(category) {
    fetch('/delete_category', {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({category: category})
    })
        .then(response => {
            if (response.ok) {
                displayCategories(); // Refresh the category list after deletion
            } else {
                showLockerZAlert("Failed to delete category.");
            }
        })
        .catch(err => console.error(err));
}

// Only use in category.html
function createCategory(newCategory) {
    if (newCategory) {
        fetch('/create_category', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({category: newCategory})
        })
            .then(response => {
                if (response.ok) {
                    populateCategorySelector(); // Refresh the selector in locker.html
                    displayCategories(); // Refresh the category list
                    showLockerZAlert("Category created!");
                } else {
                    showLockerZAlert("Category already exists or failed to create.");
                }
            })
            .catch(() => {
                showLockerZAlert("Failed to create category due to network or server error.");
            });
    }
}

async function generateImageGallery() {
    const galleryContainer = document.getElementById('image-gallery');
    galleryContainer.innerHTML = ''; // Clear existing gallery
    const selectedCategory = document.getElementById("category").value;

    // Check if there are any uploaded images
    if (uploadedImages.size === 0) {
        const dropMessage = document.createElement('div');
        dropMessage.textContent = "No images found for this category. Drop your images here!";
        dropMessage.classList.add('drop-message');
        galleryContainer.appendChild(dropMessage);
        return;
    }

    const imageCache = new Set(); // To track loaded images

    // Loop through each uploaded image
    for (const [index, fileName] of [...uploadedImages].entries()) {
        const imageDiv = document.createElement('div');
        imageDiv.classList.add('image-container');

        // Apply some offset for layout styling
        let offsetValue = index % 2 === 0 ? -20 : 0;
        imageDiv.style.setProperty('--offset', `${offsetValue}px`);

        const image = document.createElement('img');
        image.src = ''; // Set initial src to empty
        image.alt = fileName;
        image.id = `img-${fileName}`;

        image.onclick = function () {
            openModal(image.src); // Open image in modal on click
        };

        image.oncontextmenu = function (event) {
            event.preventDefault();
            showContextMenu(event, fileName, false, null); // Right-click context menu
        };

        // Create tags div
        const tagsDiv = document.createElement('div');
        tagsDiv.classList.add('tags-container');
        const tags = await window.electron.getTagsForImage(fileName);

        if (tags.length === 0) {
            const noTagsMessage = document.createElement('span');
            noTagsMessage.classList.add('no-tags');
            noTagsMessage.textContent = 'No tags available';
            tagsDiv.appendChild(noTagsMessage);
        } else {
            tags.slice(0, 3).forEach(tag => {
                const tagElement = document.createElement('span');
                tagElement.classList.add('tag');
                tagElement.textContent = tag;
                tagElement.oncontextmenu = function (event) {
                    event.preventDefault();
                    showContextMenu(event, fileName, true, tag);
                };
                tagsDiv.appendChild(tagElement);
            });

            // If there are more than 3 tags, show "More..."
            if (tags.length > 3) {
                const moreTagElement = document.createElement('span');
                moreTagElement.classList.add('tag');
                moreTagElement.textContent = "More...";
                tagsDiv.appendChild(moreTagElement);
            }
        }

        imageDiv.appendChild(image);
        imageDiv.appendChild(tagsDiv);
        galleryContainer.appendChild(imageDiv);

        const observer = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !imageCache.has(fileName)) {
                    window.electron.serveFile(selectedCategory, fileName)
                        .then(filePath => {
                            if (filePath) {
                                image.src = `file://${filePath}`;
                                imageCache.add(fileName);
                                observer.disconnect();
                            }
                        })
                        .catch(err => console.error('Error loading image:', err));
                }
            });
        }, {threshold: 0.5});

        observer.observe(imageDiv); // Start observing the image div
    }
}

async function loadImages() {
    const galleryContainer = document.getElementById('image-gallery');
    const selectedCategory = document.getElementById("category").value;

    if (!selectedCategory) {
        const dropMessage = document.createElement('div');
        dropMessage.textContent = "No Category found. Select the category first!";
        dropMessage.classList.add('drop-message');
        galleryContainer.appendChild(dropMessage);
        return;
    }

    uploadedImages.clear();

    try {
        const data = await window.electron.getImages(selectedCategory); // Call Electron's IPC method
        console.log("Get Image: " + data);

        if (data.images) {
            data.images.forEach(fileName => uploadedImages.add(fileName));
            generateImageGallery(); // This will generate the image gallery using the filenames
        } else {
            console.error('No images found or error fetching images:', data.error);
        }
    } catch (err) {
        console.error('Error loading images:', err);
    }
}


function deleteImage(fileName) {
    const selectedCategory = document.getElementById("category").value;

    fetch('/delete_image', {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({fileName: fileName, category: selectedCategory})
    })
        .then(response => {
            if (response.ok) {
                uploadedImages.delete(fileName);
                generateImageGallery();
            } else {
                showLockerZAlert("Failed to delete image: " + response.statusText);
            }
        })
        .catch(err => console.error('Error deleting image:', err));
}

function setupDropZone() {
    const galleryContainer = document.getElementById('image-gallery');
    const categorySelect = document.getElementById("category"); // Assuming the category dropdown is used.

    galleryContainer.addEventListener('dragover', (event) => {
        event.preventDefault();
        galleryContainer.classList.add('dragging');
    });

    galleryContainer.addEventListener('dragleave', () => {
        galleryContainer.classList.remove('dragging');
    });

    galleryContainer.addEventListener('drop', async (event) => {
        event.preventDefault();
        galleryContainer.classList.remove('dragging');

        const files = Array.from(event.dataTransfer.files);

        const filePaths = files.map(file => {
            return window.electron.getFilePath(file);
        });

        const selectedCategory = categorySelect.value;
        const categoryPath = await window.electron.getCategoryPath(selectedCategory);

        if (filePaths.length > 0 && filePaths[0] && categoryPath) {
            window.electron.sendFilePaths({
                filePaths,
                categoryName: selectedCategory,  // Send the category name
                categoryPath  // Send the full category path
            });
        } else {
            console.error('No valid file paths or category path missing.');
        }
    });
    refreshPageAfterUpload();
}

function refreshPageAfterUpload() {
    window.electron.onFileUploadComplete(({success, message}) => {
        if (success) {
            console.log(message);  // Success message
            showLockerZAlert(message);
            loadImages();  // Call your function to refresh the image gallery
        } else {
            showLockerZAlert('File upload failed:', message)
            console.error('File upload failed:', message);
        }
    });
}
