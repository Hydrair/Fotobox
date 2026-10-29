const REFRESH_INTERVAL = 10000;

let images = [];
let current = -1;

async function loadGallery() {
  try {
    const response = await fetch("/api/images");
    const newImages = await response.json();
    if (newImages.map((i) => i.name).join() === images.map((i) => i.name).join()) {
      return;
    }
    // Keep the photo that is open in the lightbox, its index shifts with new photos
    const openName = current >= 0 ? images[current].name : null;
    images = newImages;
    renderGallery();
    if (openName) current = images.findIndex((image) => image.name === openName);
  } catch (err) {
    console.error("Error loading images:", err);
  }
}

function renderGallery() {
  const gallery = document.getElementById("gallery");
  const thumbnails = images.map((image, index) => {
    const img = document.createElement("img");
    img.src = image.url;
    img.alt = image.name;
    img.loading = "lazy";
    img.addEventListener("click", () => openLightbox(index));
    return img;
  });
  gallery.replaceChildren(...thumbnails);

  document.getElementById("empty").hidden = images.length > 0;
  document.getElementById("photo-count").textContent =
    images.length === 1 ? "1 Foto" : `${images.length} Fotos`;
}

function openLightbox(index) {
  if (images.length === 0) return;
  current = (index + images.length) % images.length;
  const image = images[current];

  document.getElementById("lightbox-image").src = image.url;
  const download = document.getElementById("lightbox-download");
  download.href = `${image.url}?download`;
  download.setAttribute("download", image.name);
  history.replaceState(null, "", `#${image.name}`);

  const lightbox = document.getElementById("lightbox");
  if (!lightbox.open) lightbox.showModal();
}

function closeLightbox() {
  document.getElementById("lightbox").close();
}

function setupLightbox() {
  const lightbox = document.getElementById("lightbox");
  lightbox.addEventListener("close", () => {
    current = -1;
    history.replaceState(null, "", location.pathname);
  });
  document.getElementById("lightbox-close").addEventListener("click", closeLightbox);
  document
    .getElementById("lightbox-prev")
    .addEventListener("click", () => openLightbox(current - 1));
  document
    .getElementById("lightbox-next")
    .addEventListener("click", () => openLightbox(current + 1));

  document.addEventListener("keydown", (event) => {
    if (!lightbox.open) return;
    if (event.key === "ArrowLeft") openLightbox(current - 1);
    if (event.key === "ArrowRight") openLightbox(current + 1);
  });

  // Swipe left/right on phones
  let touchStartX = null;
  lightbox.addEventListener("touchstart", (event) => {
    touchStartX = event.touches[0].clientX;
  });
  lightbox.addEventListener("touchend", (event) => {
    if (touchStartX === null) return;
    const deltaX = event.changedTouches[0].clientX - touchStartX;
    touchStartX = null;
    if (Math.abs(deltaX) > 50) openLightbox(current + (deltaX < 0 ? 1 : -1));
  });
}

// Opens the photo from the URL hash, e.g. /gallery#photo_123.jpeg (used by the QR code on the Fotobox)
function openPhotoFromHash() {
  const name = decodeURIComponent(location.hash.slice(1));
  const index = images.findIndex((image) => image.name === name);
  if (index >= 0) openLightbox(index);
}

async function setup() {
  setupLightbox();
  await loadGallery();
  openPhotoFromHash();
  setInterval(loadGallery, REFRESH_INTERVAL);
}

setup();
