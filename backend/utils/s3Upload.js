import AWS from 'aws-sdk';
import fs from 'fs';

// Check if AWS credentials are configured
const isAwsConfigured = () => {
  return (
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY &&
    process.env.AWS_S3_BUCKET_NAME
  );
};

let s3 = null;
if (isAwsConfigured()) {
  s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || 'us-east-1'
  });
}

export const uploadToS3 = (file, folder = 'uploads') => {
  return new Promise((resolve, reject) => {
    if (!isAwsConfigured() || !s3) {
      reject(new Error('AWS S3 is not configured'));
      return;
    }

    const fileContent = fs.readFileSync(file.path);
    const params = {
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: `${folder}/${Date.now()}-${file.originalname}`,
      Body: fileContent,
      ContentType: file.mimetype,
      ACL: 'public-read'
    };

    s3.upload(params, (err, data) => {
      if (err) {
        reject(err);
      } else {
        // Delete local file after upload
        fs.unlinkSync(file.path);
        resolve(data.Location);
      }
    });
  });
};

export const deleteFromS3 = (fileUrl) => {
  return new Promise((resolve, reject) => {
    if (!isAwsConfigured() || !s3) {
      reject(new Error('AWS S3 is not configured'));
      return;
    }

    const key = fileUrl.split('.com/')[1] || fileUrl.split('.s3.')[1]?.split('/').slice(1).join('/');
    if (!key) {
      reject(new Error('Invalid S3 URL'));
      return;
    }

    const params = {
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: key
    };

    s3.deleteObject(params, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
};
