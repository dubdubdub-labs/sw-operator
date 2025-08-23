import { z } from "zod";
import { PlatformError } from "./errors/platform.error";

const DEFAULT_BASE_URL = "https://api.instantdb.com";
const TRAILING_SLASH_RE = /\/$/;

// Zod schema mirroring reference/platform.ts
const InstantAppSchema = z.object({
  id: z.string(),
  title: z.string(),
  "admin-token": z.string(),
  created_at: z.string(),
  schema: z
    .object({
      refs: z.record(z.string(), z.unknown()),
      blobs: z.record(z.string(), z.unknown()),
    })
    .optional(),
  creator_id: z.string().optional(),
  connection_string: z.string().nullable().optional(),
  deletion_marked_at: z.string().nullable().optional(),
  perms: z.unknown().nullable().optional(),
});

const InstantAppResponseSchema = z.object({ app: InstantAppSchema });

export type InstantApp = z.infer<typeof InstantAppSchema>;

export type InstantPlatformConfig = {
  platformToken: string;
  baseUrl?: string;
  userAgent?: string;
};

const threeWordName = () => {
  const adjectives = [
    "brisk",
    "calm",
    "daring",
    "eager",
    "fair",
    "grand",
    "hazy",
    "ideal",
    "jolly",
    "keen",
  ];
  const colors = [
    "amber",
    "blue",
    "crimson",
    "denim",
    "emerald",
    "fuchsia",
    "gold",
    "hazel",
    "ivory",
    "jade",
  ];
  const nouns = [
    "otter",
    "willow",
    "comet",
    "canyon",
    "meadow",
    "sparrow",
    "harbor",
    "summit",
    "prairie",
    "reef",
  ];
  const rnd = (n: number) => Math.floor(Math.random() * n);
  return `${adjectives[rnd(adjectives.length)]}-${colors[rnd(colors.length)]}-${nouns[rnd(nouns.length)]}`;
};

export class InstantPlatformService {
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;

  constructor(config: InstantPlatformConfig) {
    this.baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(
      TRAILING_SLASH_RE,
      ""
    );
    this.headers = {
      Authorization: `Bearer ${config.platformToken}`,
      "Content-Type": "application/json",
      "User-Agent": config.userAgent ?? "instant-platform-service/0.1",
    };
  }

  async createApp(input?: { title?: string }): Promise<InstantApp> {
    const title =
      input?.title?.trim() && input.title.trim().length > 0
        ? input.title.trim()
        : threeWordName();
    const res = await fetch(`${this.baseUrl}/superadmin/apps`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({ title }),
    });

    if (!res.ok) {
      let body: unknown;
      try {
        body = await res.json();
      } catch {
        body = await res.text();
      }
      throw new PlatformError(
        "HTTP_ERROR",
        `Failed to create app (${res.status})`,
        body
      );
    }

    const json = await res.json();
    const parsed = InstantAppResponseSchema.safeParse(json);
    if (!parsed.success) {
      throw new PlatformError(
        "VALIDATION_ERROR",
        "Invalid response from InstantDB Platform API",
        parsed.error.issues
      );
    }
    return parsed.data.app;
  }
}

export * as errors from "./errors";
