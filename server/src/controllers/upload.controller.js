import { getCloudinaryClient, getCloudinaryPublicConfig, isCloudinaryConfigured } from "../config/cloudinary.js";

const IMAGE_DATA_URI_PATTERN = /^data:image\/(?:jpeg|png|webp|gif);base64,/i;

export function getCloudinaryConfig(req, res) {
  if (!isCloudinaryConfigured()) {
    return res.status(200).json({
      configured: false,
      message: "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET on the server.",
    });
  }

  const publicConfig = getCloudinaryPublicConfig();

  return res.status(200).json({
    configured: true,
    mode: "server",
    cloudName: publicConfig?.cloudName || null,
  });
}

export async function uploadImage(req, res) {
  try {
    const client = getCloudinaryClient();
    if (!client) {
      return res.status(503).json({
        message: "Cloudinary is not configured on the server.",
      });
    }

    const { image, folder = "orcaxcare/avatars" } = req.body || {};
    if (!image || typeof image !== "string") {
      return res.status(400).json({ message: "Image data is required." });
    }
    if (!IMAGE_DATA_URI_PATTERN.test(image)) {
      return res.status(400).json({ message: "Only JPEG, PNG, WebP, or GIF images are allowed." });
    }

    const base64Part = image.split(",")[1] || "";
    const bytes = Math.ceil((base64Part.length * 3) / 4);
    if (bytes > 5 * 1024 * 1024) {
      return res.status(400).json({ message: "Image must be 5 MB or smaller." });
    }

    const safeFolder = String(folder)
      .trim()
      .replace(/[^a-zA-Z0-9/_-]/g, "")
      .slice(0, 120);

    const result = await client.uploader.upload(image, {
      folder: safeFolder || "orcaxcare/avatars",
      resource_type: "image",
    });

    return res.status(201).json({ url: result.secure_url });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message || "Upload failed" });
  }
}
