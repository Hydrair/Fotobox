// Prevents starting a second countdown while a photo is being taken.
let busy = false;

function clickButton() {
  document.getElementById("record-button").addEventListener("click", () => {
    if (busy) return;
    busy = true;
    embiggenVideo();
    // setTimeout(() => {
    //   shrinkVideo();
    // }, 5000);
  });
}

function embiggenVideo() {
  const videoElement = document.getElementById("webcam");
  document.body.style.setProperty("opacity", "0");
  setTimeout(() => {
    document.body.style.removeProperty("opacity");
    videoElement.setAttribute("width", "1920");
    videoElement.setAttribute("height", "1080");
    videoElement.classList.add("big");
    countdown();
  }, 500);
}

function shrinkVideo() {
  const videoElement = document.getElementById("webcam");
  document.body.style.setProperty("opacity", "0");
  setTimeout(() => {
    document.body.style.removeProperty("opacity");
    videoElement.removeAttribute("width");
    videoElement.removeAttribute("height");
    videoElement.classList.remove("big");
  }, 500);
}

function countdown() {
  const countdownElement = document.createElement("div");
  countdownElement.id = "countdown";
  const countContainer = document.getElementById("countdown-container");
  countContainer.style.setProperty("display", "flex");
  countContainer.appendChild(countdownElement);

  let count = 3;
  const intervalId = setInterval(async () => {
    countdownElement.textContent = count;
    count--;
    if (count < 0) {
      clearInterval(intervalId);
      countdownElement.innerHTML =
        "<div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div>";
      countdownElement.classList.add("lds-roller");
      const filename = await capturePhoto();
      countdownElement.innerHTML = "";
      countdownElement.classList.remove("lds-roller");
      if (filename) {
        showPreview(countdownElement, filename);
      }

      setTimeout(() => {
        shrinkVideo();
        countContainer.style.setProperty("display", "none");
        countContainer.removeChild(countdownElement);
        busy = false;
      }, filename ? 8000 : 0);
    }
  }, 1000);
}

// Shows the photo that was just taken together with a QR code
// that opens it in the gallery on the guest's phone.
function showPreview(element, filename) {
  element.classList.add("img-preview");
  element.style.backgroundImage = `url(images/${filename})`;

  const qr = document.createElement("figure");
  qr.classList.add("qr-card", "preview-qr");
  qr.innerHTML = `
    <img src="/qr.svg?path=${encodeURIComponent(`/gallery#${filename}`)}" alt="QR-Code zum Foto" />
    <figcaption>Foto aufs Handy</figcaption>`;
  element.appendChild(qr);
}

function blurButton() {
  document.getElementById("record-button").addEventListener("click", () => {
    setTimeout(() => {
      document.getElementById("record-button").blur();
    }, 400);
  });
}

// JavaScript to load and display the placeholder images
async function loadImages() {
  const response = await fetch("/api/images");
  const imagePaths = (await response.json())
    .map((image) => image.url)
    .sort(() => Math.random() - 0.5);

  const container = document.createElement("div");
  container.classList.add("photostream-container");
  for (const imagePath of imagePaths) {
    const img = document.createElement("img");
    img.src = imagePath;
    img.classList.add("photo");
    container.appendChild(img);
  }
  const containerSecondary = container.cloneNode(true);
  container.classList.add("primary");
  containerSecondary.classList.add("secondary");

  document
    .getElementById("right")
    .replaceChildren(container, containerSecondary);

  document.body.style.setProperty("--yValuePos", `${imagePaths.length * 35}%`);
  document.body.style.setProperty("--yValueNeg", `-${imagePaths.length * 35}%`);
  document.body.style.setProperty("--duration", `${imagePaths.length * 2}s`);
}

let currentStream = null;

async function getWebcam(device) {
  // Release the previous camera first, Windows can't open the same camera twice
  if (currentStream) {
    currentStream.getTracks().forEach((track) => track.stop());
    currentStream = null;
  }

  const videoConstraints = {
    width: { ideal: 1920 },
    height: { ideal: 1080 },
    ...(device ? { deviceId: { exact: device } } : {}),
  };
  try {
    currentStream = await navigator.mediaDevices.getUserMedia({
      video: videoConstraints,
    });
  } catch (err) {
    console.error("Error accessing webcam:", err);
    showCameraError(err);
    return;
  }
  showCameraError(null);

  const video = document.getElementById("webcam");
  video.srcObject = currentStream;
  video.play().catch(() => {});
}

function showCameraError(err) {
  const messages = {
    NotAllowedError:
      "Kamerazugriff wurde verweigert – bitte im Browser erlauben und neu laden.",
    NotReadableError:
      "Kamera ist belegt – läuft sie noch in einem anderen Programm (z. B. Teams, Zoom) oder Tab?",
    NotFoundError: "Keine Kamera gefunden.",
    OverconstrainedError: "Die gewählte Kamera ist nicht verfügbar.",
  };
  const element = document.getElementById("camera-error");
  element.hidden = !err;
  if (err) {
    element.textContent =
      messages[err.name] || `Kamera konnte nicht gestartet werden: ${err.message}`;
  }
}

function gotDevices(mediaDevices) {
  const select = document.getElementById("select");
  select.innerHTML = "";
  select.appendChild(document.createElement("option"));
  let count = 1;
  const activeDevice = currentStream
    ? currentStream.getVideoTracks()[0].getSettings().deviceId
    : "";
  mediaDevices.forEach((mediaDevice) => {
    if (mediaDevice.kind === "videoinput") {
      const option = document.createElement("option");
      option.value = mediaDevice.deviceId;
      const label = mediaDevice.label || `Camera ${count++}`;
      const textNode = document.createTextNode(label);
      option.appendChild(textNode);
      option.selected = mediaDevice.deviceId === activeDevice;
      select.appendChild(option);
    }
  });
  select.addEventListener("change", (obj) => {
    getWebcam(select.value);
  });
}

function capturePhoto() {
  const videoElement = document.getElementById("webcam");
  const canvas = document.createElement("canvas");
  canvas.width = videoElement.videoWidth;
  canvas.height = videoElement.videoHeight;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

  const imageData = canvas.toDataURL("image/jpeg");

  // Send the captured image data to the server, resolves to the filename
  return sendImageToServer(imageData);
}

async function sendImageToServer(imageData) {
  try {
    const response = await fetch("/upload", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ image: imageData }),
    });

    if (response.ok) {
      const data = await response.json();
      const { filename } = data; // Get the filename from the response JSON
      console.log("Image uploaded successfully. Filename:", filename);
      loadImages(); // Load images after successful upload
      return filename;
    } else {
      console.error(
        "Failed to upload image:",
        response.status,
        response.statusText
      );
    }
  } catch (err) {
    console.error("Error uploading image:", err);
  }
}

function clearForm() {
  document.getElementById('email-form').addEventListener('submit', function(event) {
    event.preventDefault(); // Prevent the default form submission

    const email = document.getElementById('email').value;

    fetch('/submit-email', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'email=' + encodeURIComponent(email)
    })
    .then(response => response.text())
    .then(data => {
        console.log(data); // Handle server response here
        document.getElementById('email-form').reset(); // Clear the form
    })
    .catch(error => console.error('Error:', error));
});}

async function showGalleryLink() {
  const response = await fetch("/api/config");
  const { galleryUrl } = await response.json();
  document.getElementById("gallery-url").textContent = galleryUrl;
}

async function setupCamera() {
  if (!navigator.mediaDevices) {
    showCameraError({
      message: "Kamera ist nur über localhost oder HTTPS verfügbar.",
    });
    return;
  }
  await getWebcam();
  // Device ids and labels are only available after camera access was granted
  gotDevices(await navigator.mediaDevices.enumerateDevices());
}

function setup() {
  setupCamera();
  clickButton();
  blurButton();
  loadImages();
  clearForm();
  showGalleryLink();
}

setup();
