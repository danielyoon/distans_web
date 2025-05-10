const multer = require("multer");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

const storage = multer.memoryStorage();
const upload = multer({ storage });

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

async function uploadImageToS3(file, name) {
  const params = {
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    Key: name,
    Body: file.buffer,
    ContentType: file.mimetype,
    ACL: "public-read",
  };

  const command = new PutObjectCommand(params);
  await s3.send(command);

  // Manually construct the file URL, since PutObjectCommand doesn't return `Location` like v2.
  const location = `https://${params.Bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${params.Key}`;
  return location;
}

module.exports = {
  upload,
  uploadImageToS3,
};
