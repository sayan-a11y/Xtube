import { S3Client, DeleteObjectCommand, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';

const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export const uploadToR2 = async (file: Buffer, fileName: string, contentType: string) => {
  const upload = new Upload({
    client: r2Client,
    params: {
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: fileName,
      Body: file,
      ContentType: contentType,
    },
  });

  await upload.done();
  const publicDomain = process.env.R2_PUBLIC_DOMAIN?.startsWith('http') 
    ? process.env.R2_PUBLIC_DOMAIN 
    : `https://${process.env.R2_PUBLIC_DOMAIN}`;
  return `${publicDomain}/${fileName}`;
};

export const deleteFromR2 = async (key: string) => {
  const command = new DeleteObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
  });
  await r2Client.send(command);
};

export const deletePrefixFromR2 = async (prefix: string) => {
  const listCommand = new ListObjectsV2Command({
    Bucket: process.env.R2_BUCKET_NAME!,
    Prefix: prefix,
  });

  const list = await r2Client.send(listCommand);
  if (list.Contents && list.Contents.length > 0) {
    const deleteCommand = new DeleteObjectsCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Delete: {
        Objects: list.Contents.map((obj) => ({ Key: obj.Key })),
      },
    });
    await r2Client.send(deleteCommand);
  }
};

export default r2Client;
