const express = require("express");
const fs = require("fs");
const path = require("path");
const QRCode = require("qrcode");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));


let urlDatabase = {};

if (fs.existsSync("db.json")) {
  try {
    urlDatabase = JSON.parse(fs.readFileSync("db.json", "utf8"));
  } catch {
    urlDatabase = {};
  }
}


let saveTimeout;
function bufferedSave() {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    fs.writeFileSync("db.json", JSON.stringify(urlDatabase, null, 2));
  }, 2000);
}


function generateCode() {
  let code;
  do {
    code = Math.random().toString(36).substring(2, 8);
  } while (urlDatabase[code]); // retry on collision
  return code;
}


function isValidUrl(url) {
  // Must start with http:// or https://, have a valid domain]
  const regex = /^(https?:\/\/)([\w-]+\.)+([a-zA-Z]{2,})(\/[^\s]*)?$/;
  if (!regex.test(url)) return false;

  try {
    const parsed = new URL(url);
    if (parsed.hostname.endsWith(".xyz")) return false; // block .xyz
  } catch {
    return false;
  }

  return true;
}


app.post("/shorten", async (req, res) => {
  const { originalUrl } = req.body;

  
  if (!originalUrl || !isValidUrl(originalUrl)) {
    return res.status(400).json({
      error: "Invalid URL. Must be a valid http/https URL. .xyz domains are not allowed.",
    });
  }

  const code = generateCode();
  const shortUrl = `${req.protocol}://${req.get("host")}/${code}`;

  
  urlDatabase[code] = {
    originalUrl,
    shortUrl,
    createdAt: new Date().toISOString(), 
    clickCount: 0,
    isDeleted: false,
  };

  bufferedSave();

  
  const qrCode = await QRCode.toDataURL(shortUrl);

  return res.status(201).json({
    shortUrl,
    originalUrl,
    qrCode,       
    createdAt: urlDatabase[code].createdAt,
    note: "This is a one-shot link. It self-destructs after the first click.",
  });
});


app.get("/:code/report", (req, res) => {
  const record = urlDatabase[req.params.code];
  if (!record) {
    return res.status(404).json({ error: "Link not found." });
  }
  return res.status(200).json({
    code: req.params.code,
    originalUrl: record.originalUrl,
    shortUrl: record.shortUrl,
    createdAt: record.createdAt,
    usedAt: record.usedAt || null,
    clickCount: record.clickCount,
    status: record.isDeleted ? "consumed" : "active",
  });
});


app.get("/:code", (req, res) => {
  const { code } = req.params;
  const record = urlDatabase[code];

  
  if (!record || record.isDeleted) {
    return res.status(404).sendFile(path.join(__dirname, "public", "404.html"));
  }

  
  record.clickCount += 1;
  record.isDeleted = true;
  record.usedAt = new Date().toISOString(); // UTC — when the link was consumed
  bufferedSave();

  return res.redirect(302, record.originalUrl);
});


app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});