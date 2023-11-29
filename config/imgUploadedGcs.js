const { Storage } = require("@google-cloud/storage");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const multer = require("multer");

// Adjust the path to your service account key
const pathKey = path.resolve("./serviceaccounts.json");

// Create a new Storage instance
const gcs = new Storage({
  projectId: process.env.PROJECT_ID,
  keyFilename: pathKey,
});

// Adjust the bucket name based on your configuration
const bucketName = process.env.BUCKET_NAME;
const bucket = gcs.bucket(bucketName);

// Function to generate public URL for a file
function getPublicUrl(filename) {
  return `https://storage.googleapis.com/${bucketName}/${filename}`;
}

let ImgUpload = {};

// Set up Multer for handling file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Middleware to handle single file upload
ImgUpload.uploadToGcs = upload.single("image");

// Middleware to handle file upload to Google Cloud Storage
ImgUpload.handleUpload = (req, res, next) => {
  if (!req.file) return next();

  const gcsname = uuidv4();
  const file = bucket.file(gcsname);

  const stream = file.createWriteStream({
    metadata: {
      contentType: req.file.mimetype,
    },
  });

  stream.on("error", (err) => {
    req.file.cloudStorageError = err;
    next(err);
  });

  stream.on("finish", () => {
    req.file.cloudStorageObject = gcsname;
    req.file.cloudStoragePublicUrl = getPublicUrl(gcsname);
    next();
  });

  stream.end(req.file.buffer);
};

module.exports = ImgUpload;
