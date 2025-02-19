const http = require("http");
const express = require("express");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const bodyParser = require('body-parser');

const app = express();
const webPort = 3000;
const bashPort = 3001;

const imagesPath = path.join(__dirname, "public", "images");
let imgCounter = 0;

app.use(express.static("public"));
app.use(express.static("css"));
app.use(express.static("js"));
app.use(express.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ extended: true }));

// Serve the website on port 3000
app.get("/", (req, res) => {
  const htmlFilePath = path.join(__dirname, "index.html");
  res.sendFile(htmlFilePath);
});

app.get("/images", async (req, res) => {
  try {
    const imageFiles = fs.readdirSync(imagesPath);
    const imagePaths = imageFiles.map((file) => `/images/${file}`);
    res.json(imagePaths);
  } catch (err) {
    console.error("Error reading images directory:", err);
    res.status(500).send("Error reading images directory");
  }
});

app.get("/images/:imageName", (req, res) => {
  const { imageName } = req.params;
  const imagePath = path.join(imagesPath, imageName);

  res.sendFile(imagePath, (err) => {
    if (err) {
      console.error("Error serving image:", err);
      res.status(404).send("Image not found");
    }
  });
});

app.get("/photo", async (req, res) => {
  try {
    // Adjust the command to be executed here
    const commandToExecute = `curl -o image${imgCounter++}.png  https://via.placeholder.com/550x250`;

    // Execute the Bash command
    await executeBashCommand(commandToExecute);

    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end(`Bash command executed: ${commandToExecute}`);
  } catch (err) {
    console.error("Error reading images directory:", err);
    res.status(500).send("Error reading images directory");
  }
});

app.post("/upload", express.json(), async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) {
      return res
        .status(400)
        .json({ error: "No image data found in the request body" });
    }

    // Decode the Base64 image data
    const imageData = image.replace(/^data:image\/jpeg;base64,/, "");

    // Create a unique filename using a timestamp
    const filename = `photo_${Date.now()}.jpeg`;
    const imagePath = path.join(imagesPath, filename);

    // Save the image to the server
    fs.writeFileSync(imagePath, imageData, "base64");

    console.log("Image uploaded:", filename);
    res.status(200).json({ filename }); // Respond with JSON containing the filename
  } catch (err) {
    console.error("Error handling image upload:", err);
    res
      .status(500)
      .json({ error: "An error occurred while handling the image upload" });
  }
});

app.post("/submit-email", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res
        .status(400)
        .json({ error: "No mail submitted" });
    }
    if (email && /\S+@\S+\.\S+/.test(email)) {
      // Process the email (e.g., save to database, send confirmation email, etc.)
      fd = fs.openSync('mails.txt', 'a');
      fs.appendFileSync(fd, email + "\n", "utf8");     
      res.send(`Email submitted: ${email}`);
    } else {
        res.send('Invalid email format.');
    }
  } catch (err) {
    console.error("Error handling mail list:", err);
  }
});


const server = http.createServer(app);

// Start listening for the website on port 3000
server.listen(webPort, () => {
  console.log(`Website server listening on port ${webPort}`);
});

// Function to execute the Bash command
async function executeBashCommand(command) {
  const bash = spawn("bash", ["-c", command], {
    cwd: imagesPath,
  });

  bash.stdout.on("data", (data) => {
    console.log(`Bash command output: ${data}`);
  });

  bash.stderr.on("data", (data) => {
    console.error(`Bash command error: ${data}`);
  });

  return await new Promise((resolve) => {
    bash.on("close", (code) => {
      console.log(`Bash command process exited with code ${code}`);
      resolve();
    });
  });
}
