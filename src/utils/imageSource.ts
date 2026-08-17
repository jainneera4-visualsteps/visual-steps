const BASE64_IMAGE_PATTERN = /^[A-Za-z0-9+/]+={0,2}$/;

export const normalizeImageSource = (source?: string | null): string => {
  const trimmed = String(source || '').trim();
  if (!trimmed) return '';

  if (
    trimmed.startsWith('data:image/') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('/')
  ) {
    return trimmed;
  }

  const compact = trimmed.replace(/\s/g, '');
  if (compact.length > 100 && BASE64_IMAGE_PATTERN.test(compact)) {
    return `data:image/png;base64,${compact}`;
  }

  return trimmed;
};
