// Options via URL, e.g. /slideshow?interval=10&qr=0
const params = new URLSearchParams(location.search);
const SLIDE_INTERVAL = (Number(params.get("interval")) || 6) * 1000;
const REFRESH_INTERVAL = 5000;

let images = [];
let queue = [];
let shown = 0;
const slides = document.querySelectorAll(".slide");

async function refreshImages() {
  try {
    const response = await fetch("/api/images");
    const newImages = await response.json();

    // New photos jump the queue so guests see them right away
    const known = new Set(images.map((image) => image.name));
    const fresh = images.length > 0 ? newImages.filter((i) => !known.has(i.name)) : [];
    queue = [...fresh, ...queue.filter((image) => newImages.some((i) => i.name === image.name))];

    images = newImages;
    document.getElementById("empty").hidden = images.length > 0;
    if (fresh.length > 0) restartTimer();
  } catch (err) {
    console.error("Error loading images:", err);
  }
}

function nextImage() {
  if (queue.length === 0) {
    queue = [...images].sort(() => Math.random() - 0.5);
  }
  return queue.shift();
}

// Crossfades between the two <img> elements
function showNext() {
  const image = nextImage();
  if (!image) return;

  const next = slides[shown % 2];
  const previous = slides[(shown + 1) % 2];
  next.onload = () => {
    next.classList.add("visible");
    previous.classList.remove("visible");
  };
  next.src = image.url;
  shown++;
}

let timer = null;
function restartTimer() {
  clearInterval(timer);
  showNext();
  timer = setInterval(showNext, SLIDE_INTERVAL);
}

async function setup() {
  if (params.get("qr") === "0") {
    document.getElementById("slideshow-qr").hidden = true;
  }
  document.body.addEventListener("click", () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen();
  });

  await refreshImages();
  restartTimer();
  setInterval(refreshImages, REFRESH_INTERVAL);
}

setup();
