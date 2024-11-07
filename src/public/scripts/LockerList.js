const uploadedImages = new Set();

function populateCategorySelector() {
    const categorySelect = document.getElementById("category");
    fetch('/categories')  // Adjust this URL based on your setup
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok ' + response.statusText);
            }
            return response.json();
        })
        .then(data => {
            categorySelect.innerHTML = ''; // Clear existing options

            if (data && Array.isArray(data.categories) && data.categories.length > 0) {
                data.categories.forEach(category => {
                    let option = document.createElement("option");
                    option.value = category;
                    option.textContent = category;
                    categorySelect.appendChild(option);
                });

                categorySelect.value = data.categories[0]; // Set the first category as selected
            } else {
                let option = document.createElement("option");
                option.value = '';
                option.textContent = 'No categories found';
                option.disabled = true;  // Disable the "No categories" option to prevent selection
                categorySelect.appendChild(option);
            }

            updateCategory();
        })
        .catch(err => {
            console.error('Error fetching categories:', err);
        });
}

function updateCategory() {
    const categoryList = document.getElementById("category").value;
    if (categoryList.trim() === '')
        document.getElementById("currentCategory").textContent = "No category available";
    else
        document.getElementById("currentCategory").textContent = categoryList;

    loadImages();
}

let categoryToDelete = null;  // To store the category that the user intends to delete

function displayCategories() {
    const categoryList = document.getElementById("category-list");
    const editCategoryModal = document.getElementById("edit-category-modal");
    const editCategoryInput = document.getElementById("edit-category-input");
    const submitEditButton = document.getElementById("submit-edit");
    const cancelEditButton = document.getElementById("cancel-edit");
    const confirmModal = document.getElementById("confirm-modal");
    const submitConfirmButton = document.getElementById("submit-confirm");
    const cancelConfirmButton = document.getElementById("cancel-confirm");

    fetch('/categories')  // Endpoint to get existing categories
        .then(response => response.json())
        .then(data => {
            categoryList.innerHTML = ''; // Clear existing list

            data.categories.forEach(category => {
                const listItem = document.createElement("li");
                listItem.textContent = category;

                // Create Edit button
                const editButton = document.createElement("button");
                editButton.textContent = "Edit";
                editButton.classList.add("custom-button"); // Add custom button class
                editButton.onclick = () => {
                    editCategoryInput.value = category;  // Pre-fill the input with the current category
                    editCategoryInput.dataset.oldCategory = category; // Store the old category in the dataset
                    editCategoryModal.style.display = "flex"; // Show the modal
                };

                listItem.appendChild(editButton);

                const deleteButton = document.createElement("button");
                deleteButton.textContent = "Delete";
                deleteButton.classList.add("custom-button", "delete-button"); // Add custom button and delete button classes
                deleteButton.onclick = () => {
                    categoryToDelete = category; // Set the category to delete
                    confirmModal.style.display = "flex"; // Show the confirmation modal
                };
                listItem.appendChild(deleteButton);

                categoryList.appendChild(listItem);
            });
        })
        .catch(err => console.error(err));

    submitEditButton.addEventListener("click", () => {
        const newCategoryName = editCategoryInput.value.trim();
        const oldCategoryName = editCategoryInput.dataset.oldCategory.trim(); // Store old category name in dataset

        if (newCategoryName && newCategoryName !== oldCategoryName) {
            editCategory(oldCategoryName, newCategoryName); // Renaming the category
            editCategoryModal.style.display = "none"; // Close the modal after submitting
        } else {
            showLockerZAlert("Please enter a new category name.");
        }
    });

    cancelEditButton.addEventListener("click", () => {
        editCategoryModal.style.display = "none"; // Hide the modal without making any changes
    });

    submitConfirmButton.addEventListener("click", () => {
        if (categoryToDelete) {
            deleteCategory(categoryToDelete);  // Delete the category after confirmation
            confirmModal.style.display = "none"; // Hide the confirm modal
        }
    });

    cancelConfirmButton.addEventListener("click", () => {
        confirmModal.style.display = "none"; // Hide the confirm modal without deleting
    });
}

// Function to rename the category (this is the core edit functionality)
function editCategory(oldCategory, newCategory) {
    // Send the update request to the server to rename the category
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


function deleteCategory(category) {
    fetch('/delete_category', {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ category: category })
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

function createCategory(newCategory) {
    if (newCategory) {
        fetch('/create_category', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ category: newCategory })
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
    galleryContainer.innerHTML = '';
    const selectedCategory = document.getElementById("category").value;

    if (uploadedImages.size === 0) {
        const dropMessage = document.createElement('div');
        dropMessage.textContent = "No images found for this category. Drop your images here!";
        dropMessage.classList.add('drop-message');
        galleryContainer.appendChild(dropMessage);
        return;
    }

    [...uploadedImages].forEach((fileName, index) => {
        const imageDiv = document.createElement('div');
        imageDiv.classList.add('image-container');

        let offsetValue = index % 2 === 0 ? -20 : 0;
        imageDiv.style.setProperty('--offset', `${offsetValue}px`);

        const image = document.createElement('img');
        image.src = '';
        image.alt = fileName;
        image.id = `img-${fileName}`;
        image.classList.add('image');
        image.loading = 'lazy';
        image.onload = () => {
            image.classList.add('loaded');
        };
        image.onclick = function () {
            openModal(image.src);
        };

        image.oncontextmenu = function (event) {
            event.preventDefault();
            showContextMenu(event, fileName);
        };

        imageDiv.appendChild(image);
        galleryContainer.appendChild(imageDiv);

        const observer = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    image.src = `/files/${selectedCategory}/${fileName}`;  // Lazy load the image
                    observer.disconnect();  // Stop observing once the image has been loaded
                } else {
                    image.src = '';
                }
            });
        }, { threshold: 0.5 }); // Trigger when 50% of the image is in view

        observer.observe(imageDiv);
    });
}


function showContextMenu(event, fileName) {
    event.preventDefault();

    const contextMenu = document.getElementById("context-menu");
    contextMenu.style.left = `${event.pageX}px`;
    contextMenu.style.top = `${event.pageY}px`;
    contextMenu.classList.add("active");

    const deleteOption = document.getElementById("delete-option");
    deleteOption.onclick = function () {
        deleteImage(fileName);
        contextMenu.classList.remove("active");
    };

    document.addEventListener("click", () => {
        contextMenu.classList.remove("active");
    }, { once: true });
}

function loadImages() {
    const galleryContainer = document.getElementById('image-gallery');
    const selectedCategory = document.getElementById("category").value;
    console.log(`Loading images for category: '${selectedCategory}'`);

    if (!selectedCategory) {
        const dropMessage = document.createElement('div');
        dropMessage.textContent = "No Category found Select the category first!.";
        dropMessage.classList.add('drop-message');
        galleryContainer.appendChild(dropMessage);
        return;
    }

    uploadedImages.clear();

    fetch(`/images?category=${encodeURIComponent(selectedCategory)}`)
        .then(response => {
            console.log(response);
            return response.json();
        })
        .then(data => {
            console.log(data);
            data.images.forEach(fileName => uploadedImages.add(fileName));
            generateImageGallery(); // This will use the ordered list from the server
        })
        .catch(err => console.error('Error loading images:', err));
}


function deleteImage(fileName) {
    const selectedCategory = document.getElementById("category").value;

    fetch('/delete_image', {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ fileName: fileName, category: selectedCategory })
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
            return window.electron.getFilePath(file);  // Use the method exposed by the preload script
        });

        const selectedCategory = categorySelect.value;
        const categoryPath = await window.electron.getCategoryPath(selectedCategory);  // Get the full path for the selected category

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
    window.electron.onFileUploadComplete(({ success, message }) => {
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
