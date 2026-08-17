type GeminiInlineData = {
  data?: string;
  mimeType?: string;
};

type GeminiResponsePart = {
  inlineData?: GeminiInlineData;
};

type GeminiResponseLike = {
  candidates?: Array<{
    content?: {
      parts?: GeminiResponsePart[];
    };
  }>;
};

export const extractInlineImageDataUrl = (response: GeminiResponseLike): string | null => {
  const parts = response.candidates?.[0]?.content?.parts || [];

  for (const part of parts) {
    const data = part.inlineData?.data;
    if (!data) continue;

    if (data.startsWith('data:image/')) return data;
    const mimeType = part.inlineData?.mimeType || 'image/png';
    return `data:${mimeType};base64,${data}`;
  }

  return null;
};
