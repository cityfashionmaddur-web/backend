import { r2 } from "../config/r2.js";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";

export async function getUploadUrl(req, res) {
  try {
    const { fileType } = req.body;

    if (!fileType) {
      return res.status(400).json({ message: "fileType is required" });
    }

    const fileName = `products/${crypto.randomUUID()}.${fileType.split("/")[1]}`;
    const baseUrl = process.env.R2_PUBLIC_URL || "";
    const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;

    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: fileName,
      ContentType: fileType,
    });

    const signedUrl = await getSignedUrl(r2, command, { expiresIn: 60 });

    return res.json({
      uploadUrl: signedUrl,
      imageUrl: `${normalizedBase}${fileName}`
    });

  } catch (err) {
    console.error("R2 upload error:", err);
    res.status(500).json({ message: "Failed to generate upload URL" });
  }
}
