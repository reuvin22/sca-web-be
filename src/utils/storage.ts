import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { R2_BUCKET, r2 } from "../config/r2";
import { ApiError } from "./apiError";
import { decryptBuffer, encryptBuffer } from "./encryption";

// Uploaded files are stored encrypted in Cloudflare R2 (see ENCRYPTED_DATA.md).

export async function saveEncryptedObject(key: string, content: Buffer) {
  await r2.send(new PutObjectCommand({ Bucket: R2_BUCKET, Key: key, Body: encryptBuffer(content) }));
}

export async function readEncryptedObject(key: string): Promise<Buffer> {
  const object = await r2.send(new GetObjectCommand({ Bucket: R2_BUCKET, Key: key }));
  if (!object.Body) throw new ApiError(404, "File not found");
  return decryptBuffer(Buffer.from(await object.Body.transformToByteArray()));
}

export async function deleteObject(key: string) {
  await r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key }));
}
