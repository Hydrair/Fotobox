function clickButton() {
  document.getElementById("record-button").addEventListener("click", () => {
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
      capturePhoto();
      countdownElement.innerHTML = "";
      countdownElement.classList.remove("lds-roller");
      countdownElement.classList.add("img-preview");

      setTimeout(() => {
        shrinkVideo();
        countContainer.style.setProperty("display", "none");
        countContainer.removeChild(countdownElement);
      }, 3000);
    }
  }, 1000);
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
  const response = await fetch("/images");
  const imagePaths = (await response.json()).sort(() => Math.random() - 0.5);

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

async function getWebcam(device) {
  const videoConstraints = device
    ? {
        deviceId: device,
        width: 1920,
        height: 1080,
      }
    : true;
  const stream = await navigator.mediaDevices.getUserMedia({
    video: videoConstraints,
  });
  const video = document.getElementById("webcam");
  video.srcObject = stream;
  video.play();
}

function gotDevices(mediaDevices) {
  const select = document.getElementById("select");
  select.innerHTML = "";
  select.appendChild(document.createElement("option"));
  let count = 1;
  mediaDevices.forEach((mediaDevice) => {
    if (mediaDevice.kind === "videoinput") {
      const option = document.createElement("option");
      option.value = mediaDevice.deviceId;
      const label = mediaDevice.label || `Camera ${count++}`;
      const textNode = document.createTextNode(label);
      option.appendChild(textNode);
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

  // Send the captured image data to the server
  return sendImageToServer(imageData);
}

async function sendImageToServer(imageData) {
  try {
    const response = await fetch("http://localhost:3000/upload", {
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
      const countdown = document.getElementById("countdown");
      countdown.style.backgroundImage = `url(images/${filename})`;
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

function setup() {
  navigator.mediaDevices.enumerateDevices().then(gotDevices);
  getWebcam();
  clickButton();
  blurButton();
  loadImages();
}

setup();
