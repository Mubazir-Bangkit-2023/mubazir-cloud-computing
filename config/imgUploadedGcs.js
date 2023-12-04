const { Storage } = require("@google-cloud/storage");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const multer = require("multer");

const pathKey = path.resolve("./serviceaccounts.json");

const gcs = new Storage({
  projectId: process.env.PROJECT_ID,
  keyFilename: pathKey,
});

const bucketName = process.env.BUCKET_NAME;
const bucket = gcs.bucket(bucketName);

function getPublicUrl(filename) {
  return `https://storage.googleapis.com/${bucketName}/${filename}`;
}

let ImgUpload = {};

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

ImgUpload.uploadToGcs = upload.single("image");
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
