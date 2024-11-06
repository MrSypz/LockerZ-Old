function openModal(src) {
    const modal = document.getElementById("modalImgPreview");
    const modalImg = document.getElementById("modalImg");
    const imageSize = document.getElementById("imageSize");

    modal.style.display = "block";
    modal.style.opacity = 0;

    setTimeout(() => {
        modal.style.opacity = 1;
        modalImg.src = src;

        const img = new Image();
        img.src = src;
        img.onload = function () {
            imageSize.textContent = `${img.width} x ${img.height} pixels`;
        };
    }, 10);
}

function closeModal(event) {
    const modal = document.getElementById("modalImgPreview");

    if (event.target === modal || event.target.className === "close") {
        modal.style.opacity = 0;

        setTimeout(() => {
            modal.style.display = "none";
        }, 300);
    }
}
