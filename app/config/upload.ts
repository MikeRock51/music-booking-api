import multer from "multer";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import "dotenv/config";
import path from "path";

const awsBucketName = process.env.AWS_BUCKET_NAME;
const awsRegion = process.env.AWS_REGION;

const s3 = new S3Client({
    region: awsRegion,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });

  // Set up multer to store files in memory before uploading to S3
  const storage = multer.memoryStorage();

  export const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit per file
    fileFilter: (req, file, cb) => {
      const allowedMimeTypes = ["image/jpeg", "image/png", "image/gif"];
      if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error("Only image files are allowed!"));
      }
    }
  })

  export async function uploadFileToS3(file: Express.Multer.File, uploadDir: string): Promise<string> {
    const fileExtension = path.extname(file.originalname);
    const fileName = `${crypto.randomUUID()}${fileExtension}`;

    const uploadParams = {
      Bucket: awsBucketName!,
      Key: `${uploadDir}/${fileName}`,
      Body: file.buffer,
      ContentType: file.mimetype,
    };

    await s3.send(new PutObjectCommand(uploadParams));

    return `https://${awsBucketName}.s3.${awsRegion}.amazonaws.com/${uploadDir}/${fileName}`;
  };

  export async function deleteFileFromS3(filePath: string): Promise<void> {
    const params = {
      Bucket: awsBucketName!,
      Key: filePath.replace(`https://${awsBucketName}.s3.${awsRegion}.amazonaws.com/`, ""),
    };

    await s3.send(new DeleteObjectCommand(params));
  }
