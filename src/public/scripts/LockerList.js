const uploadedImages = new Set();

function populateCategorySelector() {
    const categorySelect = document.getElementById("category");

    fetch('/categories')
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

                const lastSelectedCategory = localStorage.getItem('lastSelectedCategory');

                if (lastSelectedCategory && data.categories.includes(lastSelectedCategory)) {
                    categorySelect.value = lastSelectedCategory;
                } else {
                    categorySelect.value = data.categories[0];
                }
            } else {
                let option = document.createElement("option");
                option.value = '';
                option.textContent = 'No categories found';
                option.disabled = true;
                categorySelect.appendChild(option);
            }

            updateCategory();
        })
        .catch(err => {
            console.error('Error fetching categories:', err);
        });
}


function updateCategory() {
    const categorySelect = document.getElementById("category");
    const currentCategorySpan = document.getElementById("currentCategory");
    const selectedCategory = categorySelect.value;

    localStorage.setItem('lastSelectedCategory', selectedCategory);

    const updateCurrentCategory = () => {
        const selectedCategory = categorySelect.value;
        currentCategorySpan.textContent = selectedCategory || "No category selected"; // Fallback text
    };
    updateCurrentCategory();
    categorySelect.addEventListener("change", updateCurrentCategory);    loadImages();
}

let categoryToDelete = null;  // To store the category that the user intends to delete
// Only use in category.html
function displayCategories() {
    const categoryList = document.getElementById("category-list");
    const editCategoryModal = document.getElementById("edit-category-modal");
    const editCategoryInput = document.getElementById("edit-category-input");
    const submitEditButton = document.getElementById("submit-edit");
    const cancelEditButton = document.getElementById("cancel-edit");
    const confirmModal = document.getElementById("confirm-modal");
    const submitConfirmButton = document.getElementById("submit-confirm");
    const cancelConfirmButton = document.getElementById("cancel-confirm");

    fetch('/categories')
        .then(response => response.json())
        .then(data => {
            categoryList.innerHTML = '';

            data.categories.forEach(category => {
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
        })
        .catch(err => console.error(err));

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
// Only use in category.html
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

    const imageCache = new Set();

    for (const [index, fileName] of [...uploadedImages].entries()) {
        const imageDiv = document.createElement('div');
        imageDiv.classList.add('image-container');

        let offsetValue = index % 2 === 0 ? -20 : 0;
        imageDiv.style.setProperty('--offset', `${offsetValue}px`);

        const image = document.createElement('img');
        image.src = '';
        image.alt = fileName;
        image.id = `img-${fileName}`;

        // image.onload = () => {
        //     image.classList.add('loaded');
        // };

        image.onclick = function () {
            openModal(image.src);
        };

        image.oncontextmenu = function (event) {
            event.preventDefault();
            showContextMenu(event, fileName, false, null);
        };

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
                    image.src = `/files/${selectedCategory}/${fileName}`;
                    imageCache.add(fileName); // Cache the loaded image
                    observer.disconnect();
                }
            });
        }, { threshold: 0.5 });

        observer.observe(imageDiv);
    }
}


async function loadImages() {
    const galleryContainer = document.getElementById('image-gallery');
    const selectedCategory = document.getElementById("category").value;

    if (!selectedCategory) {
        const dropMessage = document.createElement('div');
        dropMessage.textContent = "No Category found Select the category first!";
        dropMessage.classList.add('drop-message');
        galleryContainer.appendChild(dropMessage);
        return;
    }

    uploadedImages.clear();

    try {
        const response = await fetch(`/images?category=${encodeURIComponent(selectedCategory)}`);
        const data = await response.json();

        if (data.images) {
            data.images.forEach(fileName => uploadedImages.add(fileName));
            generateImageGallery(); // This will use the ordered list from the server
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

        document.getElementById("currentCategory").addEventListener("change", selectedCategory);


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
