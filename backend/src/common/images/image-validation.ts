import { BadRequestException } from '@nestjs/common';

export type SupportedImageExtension = '.jpg' | '.png' | '.webp';

export function validateImageFile(
  file: Express.Multer.File | undefined,
  maxBytes: number,
): SupportedImageExtension {
  if (!file) throw new BadRequestException('Image is required');
  if (file.size < 1 || file.size > maxBytes) {
    throw new BadRequestException(`Image must be ${Math.floor(maxBytes / (1024 * 1024))} MB or smaller`);
  }

  const bytes = file.buffer;
  const isJpeg = bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isPng =
    bytes.length > 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a;
  const isWebp =
    bytes.length > 12 &&
    bytes.subarray(0, 4).toString('ascii') === 'RIFF' &&
    bytes.subarray(8, 12).toString('ascii') === 'WEBP';

  if (isJpeg) return '.jpg';
  if (isPng) return '.png';
  if (isWebp) return '.webp';
  throw new BadRequestException('Uploaded file content is not a supported JPEG, PNG, or WebP image');
}
