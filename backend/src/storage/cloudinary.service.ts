import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { Readable } from 'stream';

@Injectable()
export class CloudinaryService {
  constructor(private config: ConfigService) {
    const url = this.config.get<string>('CLOUDINARY_URL');
    const cloudName = this.config.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.config.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.config.get<string>('CLOUDINARY_API_SECRET');
    if (url) {
      cloudinary.config(url);
    } else {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
      });
    }
  }

  async uploadImage(
    buffer: Buffer,
    filename: string,
    folder: string,
  ): Promise<{ url: string; publicId: string }> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          public_id: filename,
          resource_type: 'image',
        },
        (error, result: UploadApiResponse | undefined) => {
          if (error || !result)
            return reject(error ?? new Error('Upload failed'));
          resolve({ url: result.secure_url, publicId: result.public_id });
        },
      );
      const readable = new Readable();
      readable.push(buffer);
      readable.push(null);
      readable.pipe(uploadStream);
    });
  }
}