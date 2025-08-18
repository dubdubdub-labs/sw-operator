export function formatUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return url;
  }
}

export function normalizeUrl(input: string): string {
  const trimmedInput = input.trim();
  if (!trimmedInput) {
    return "";
  }

  if (
    trimmedInput.startsWith("http://") ||
    trimmedInput.startsWith("https://")
  ) {
    return trimmedInput;
  }

  return `https://${trimmedInput}`;
}
