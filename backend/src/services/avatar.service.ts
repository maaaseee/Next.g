/**
 * Cloudinary Avatar Upload and Image Management Service.
 * 
 * Handles:
 * - Profile avatar uploads with automated smart facial cropping (w=256, h=256)
 * - Automatic conversion to WebP format for optimal bandwidth and fast load times
 * - Graceful fallback to deterministic DiceBear avatar when Cloudinary is not configured
 */

import { v2 as cloudinary } from 'cloudinary';
import { ENV } from '../config/env';
import { logger } from '../utils/logger';

// Configure Cloudinary globally if credentials are provided
if (ENV.CLOUDINARY_CLOUD_NAME && ENV.CLOUDINARY_API_KEY && ENV.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: ENV.CLOUDINARY_CLOUD_NAME,
    api_key: ENV.CLOUDINARY_API_KEY,
    api_secret: ENV.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

export class AvatarService {
  /**
   * Checks whether Cloudinary credentials are fully configured.
   */
  public static isConfigured(): boolean {
    return Boolean(
      ENV.CLOUDINARY_CLOUD_NAME &&
      ENV.CLOUDINARY_API_KEY &&
      ENV.CLOUDINARY_API_SECRET
    );
  }

  /**
   * Uploads or updates a user profile avatar.
   * Resizes to 256x256, auto-crops to face, converts to WebP.
   */
  public static async uploadAvatar(
    userId: string,
    file: File | Blob
  ): Promise<string> {
    if (!this.isConfigured()) {
      logger.warn('[AvatarService] Cloudinary credentials not configured. Using DiceBear fallback avatar.');
      return `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(userId)}`;
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: ENV.CLOUDINARY_FOLDER,
          public_id: `user_${userId}`,
          overwrite: true,
          resource_type: 'image',
          transformation: [
            { width: 256, height: 256, crop: 'thumb', gravity: 'face' },
            { quality: 'auto', fetch_format: 'webp' },
          ],
        },
        (error, result) => {
          if (error || !result) {
            logger.error('[AvatarService] Cloudinary upload error:', { error });
            return reject(new Error('No se pudo subir la imagen a Cloudinary.'));
          }
          resolve(result.secure_url);
        }
      );

      uploadStream.end(buffer);
    });
  }

  /**
   * Deletes an avatar from Cloudinary when user removes their picture.
   */
  public static async deleteAvatar(userId: string): Promise<void> {
    if (!this.isConfigured()) return;

    try {
      await cloudinary.uploader.destroy(`${ENV.CLOUDINARY_FOLDER}/user_${userId}`);
    } catch (err) {
      logger.warn('[AvatarService] Could not remove avatar from Cloudinary:', { error: err });
    }
  }
}
