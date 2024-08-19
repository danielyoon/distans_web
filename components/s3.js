const multer = require("multer"),
  storage = multer.memoryStorage(),
  upload = multer({ storage: storage }),
  AWS = require("aws-sdk"),
  s3 = new AWS.S3();

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

async function uploadImageToS3(file) {
  const params = {
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    Key: `places/${Date.now()}_${file.originalname}`,
    Body: file.buffer,
    ContentType: file.mimetype,
    ACL: "public-read",
  };

  const uploadResult = await s3.upload(params).promise();
  return uploadResult.Location;
}

module.exports = {
  upload,
  uploadImageToS3,
};
