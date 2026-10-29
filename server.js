const http = require("http");
const os = require("os");
const path = require("path");
const fs = require("fs");
const express = require("express");
const archiver = require("archiver");
const QRCode = require("qrcode");

const app = express();
const webPort = Number(process.env.PORT) || 3000;

// Photos are stored on the local disk of the Fotobox.
const imagesPath = path.resolve(
  process.env.IMAGES_DIR || path.join(__dirname, "public", "images")
);
const mailsPath = path.resolve(
  process.env.MAILS_FILE || path.join(__dirname, "mails.txt")
);
fs.mkdirSync(imagesPath, { recursive: true });

const IMAGE_NAME = /^[\w-]+\.(jpe?g|png)$/i;
const DATA_URL = /^data:image\/(jpeg|png);base64,/;

app.use(express.static("public"));
app.use(express.static("css"));
app.use(express.static("js"));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true }));

// URL under which guests reach the Fotobox (used for QR codes).
// Can be overridden with PUBLIC_URL, e.g. when running behind a reverse proxy.
function getPublicUrl() {
  if (process.env.PUBLIC_URL) {
    return process.env.PUBLIC_URL.replace(/\/+$/, "");
  }
  // Prefer typical (W)LAN addresses over virtual adapters (Docker, WSL, ...)
  const preference = ["192.168.", "10.", "172."];
  const rank = (ip) => {
    const index = preference.findIndex((prefix) => ip.startsWith(prefix));
    return index === -1 ? preference.length : index;
  };
  const addresses = Object.values(os.networkInterfaces())
    .flat()
    .filter((address) => address && address.family === "IPv4" && !address.internal)
    .map((address) => address.address)
    .sort((a, b) => rank(a) - rank(b));
  return `http://${addresses[0] || "localhost"}:${webPort}`;
}

// Returns all stored images, newest first.
function listImages() {
  return fs
    .readdirSync(imagesPath)
    .filter((file) => IMAGE_NAME.test(file))
    .map((file) => ({
      name: file,
      url: `/images/${file}`,
      createdAt: fs.statSync(path.join(imagesPath, file)).mtimeMs,
    }))
    .sort((a, b) => b.createdAt - a.createdAt);
}

function sendPage(page) {
  return (req, res) => res.sendFile(path.join(__dirname, page));
}

app.get("/", sendPage("index.html"));
app.get("/gallery", sendPage("gallery.html"));
app.get("/slideshow", sendPage("slideshow.html"));

app.get("/api/config", (req, res) => {
  const publicUrl = getPublicUrl();
  res.json({ publicUrl, galleryUrl: `${publicUrl}/gallery` });
});

app.get("/api/images", (req, res) => {
  try {
    res.json(listImages());
  } catch (err) {
    console.error("Error reading images directory:", err);
    res.status(500).json({ error: "Error reading images directory" });
  }
});

app.get("/images/:imageName", (req, res) => {
  const { imageName } = req.params;
  if (!IMAGE_NAME.test(imageName)) {
    return res.status(404).send("Image not found");
  }

  const options = { root: imagesPath };
  const send = req.query.download !== undefined ? res.download : res.sendFile;
  send.call(res, imageName, options, (err) => {
    if (err && !res.headersSent) {
      res.status(404).send("Image not found");
    }
  });
});

// Streams all photos as a single zip archive.
app.get("/download.zip", (req, res) => {
  const date = new Date().toISOString().slice(0, 10);
  res.attachment(`fotobox-${date}.zip`);

  // Photos are already compressed, so storing them is much faster.
  const archive = archiver("zip", { store: true });
  archive.on("warning", (err) => console.warn("Zip warning:", err));
  archive.on("error", (err) => {
    console.error("Error creating zip:", err);
    res.destroy(err);
  });
  archive.pipe(res);
  for (const image of listImages()) {
    archive.file(path.join(imagesPath, image.name), { name: image.name });
  }
  archive.finalize();
});

// Renders a QR code (SVG) for a path on this Fotobox, e.g. /qr.svg?path=/gallery
app.get("/qr.svg", async (req, res) => {
  const target = String(req.query.path || "/gallery");
  if (!target.startsWith("/") || target.startsWith("//")) {
    return res.status(400).send("Invalid path");
  }
  try {
    const svg = await QRCode.toString(getPublicUrl() + target, {
      type: "svg",
      margin: 1,
    });
    res.type("image/svg+xml").send(svg);
  } catch (err) {
    console.error("Error creating QR code:", err);
    res.status(500).send("Error creating QR code");
  }
});

app.post("/upload", (req, res) => {
  try {
    const { image } = req.body;
    const match = typeof image === "string" && image.match(DATA_URL);
    if (!match) {
      return res
        .status(400)
        .json({ error: "No image data found in the request body" });
    }

    // Decode the Base64 image data
    const extension = match[1] === "png" ? "png" : "jpeg";
    const imageData = image.slice(match[0].length);

    // Create a unique filename using a timestamp
    const filename = `photo_${Date.now()}.${extension}`;
    fs.writeFileSync(path.join(imagesPath, filename), imageData, "base64");

    console.log("Image uploaded:", filename);
    res.status(200).json({ filename, url: `/images/${filename}` });
  } catch (err) {
    console.error("Error handling image upload:", err);
    res
      .status(500)
      .json({ error: "An error occurred while handling the image upload" });
  }
});

app.post("/submit-email", (req, res) => {
  try {
    const email = String(req.body.email || "").trim();
    if (!email) {
      return res.status(400).send("No mail submitted");
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).send("Invalid email format.");
    }
    fs.appendFileSync(mailsPath, email + "\n", "utf8");
    res.send(`Email submitted: ${email}`);
  } catch (err) {
    console.error("Error handling mail list:", err);
    res.status(500).send("Error saving email");
  }
});

const server = http.createServer(app);

server.listen(webPort, () => {
  console.log(`Fotobox:   http://localhost:${webPort}`);
  console.log(`Galerie:   ${getPublicUrl()}/gallery`);
  console.log(`Slideshow: ${getPublicUrl()}/slideshow`);
  console.log(`Fotos werden gespeichert in: ${imagesPath}`);
});
