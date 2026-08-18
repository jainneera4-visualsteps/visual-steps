export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const UPLOAD_BUCKET = 'visual-steps-uploads';

export type SupportedImageType = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';

const extensionByType: Record<SupportedImageType, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

export const isSupportedImageMimeType = (mimeType: string): mimeType is SupportedImageType => (
  Object.hasOwn(extensionByType, mimeType)
);

export const detectImageType = (bytes: Uint8Array): SupportedImageType | null => {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    bytes.length >= 8
    && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
    && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) {
    return 'image/png';
  }
  if (bytes.length >= 6) {
    const signature = String.fromCharCode(...bytes.slice(0, 6));
    if (signature === 'GIF87a' || signature === 'GIF89a') return 'image/gif';
  }
  if (bytes.length >= 12) {
    const riff = String.fromCharCode(...bytes.slice(0, 4));
    const webp = String.fromCharCode(...bytes.slice(8, 12));
    if (riff === 'RIFF' && webp === 'WEBP') return 'image/webp';
  }
  return null;
};

export const getImageExtension = (mimeType: SupportedImageType): string => extensionByType[mimeType];
