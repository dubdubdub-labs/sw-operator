// Regex to remove trailing slash
const TRAILING_SLASH = /\/$/;

export class URLBuilder {
  private baseUrl: string;

  constructor(baseUrl: string) {
    // Remove trailing slash if present
    this.baseUrl = baseUrl.replace(TRAILING_SLASH, "");
  }

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Need to handle various parameter types for URL building
  build(path: string, params?: Record<string, unknown>): string {
    // Ensure path starts with /
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    const url = new URL(`${this.baseUrl}${normalizedPath}`);

    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value === undefined || value === null) {
          continue;
        }

        if (typeof value === "object" && !Array.isArray(value)) {
          // Handle nested objects (like metadata[key]=value)
          for (const [nestedKey, nestedValue] of Object.entries(value)) {
            if (nestedValue !== undefined && nestedValue !== null) {
              url.searchParams.append(
                `${key}[${nestedKey}]`,
                String(nestedValue)
              );
            }
          }
        } else if (Array.isArray(value)) {
          // Handle arrays
          for (const item of value) {
            url.searchParams.append(key, String(item));
          }
        } else {
          url.searchParams.append(key, String(value));
        }
      }
    }

    return url.toString();
  }
}
