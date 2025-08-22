import type {
  CreateSnapshotTokenResponse,
  SnapshotModel,
  SnapshotModelCollection,
} from "../types/models.js";
import type {
  CreateSnapshotRequest,
  SnapshotInstanceRequest,
} from "../types/requests.js";
import {
  CreateSnapshotOptionsSchema,
  CreateSnapshotTokenResponseSchema,
  SnapshotSchema,
} from "../types/schemas.js";
import { BaseService } from "./base.service.js";

export type SnapshotFilters = {
  digest?: string | null;
  metadata?: Record<string, string>;
  [key: string]: unknown;
};

export interface ShareToken {
  token: string;
  expiresIn: number;
}

export interface SnapshotOptions {
  digest?: string | null;
  metadata?: Record<string, string> | null;
}

export class SnapshotService extends BaseService {
  async create(options: CreateSnapshotRequest): Promise<SnapshotModel> {
    const validatedOptions = CreateSnapshotOptionsSchema.parse(options);

    const response = await this.client.request<SnapshotModel>({
      method: "POST",
      path: "/snapshot",
      body: validatedOptions,
    });

    return this.client.validateResponse(response, SnapshotSchema);
  }

  async list(filters?: SnapshotFilters): Promise<SnapshotModel[]> {
    const response = await this.client.request<SnapshotModelCollection>({
      method: "GET",
      path: "/snapshot",
      params: filters,
    });

    return response.data.map((snapshot) =>
      this.client.validateResponse(snapshot, SnapshotSchema)
    );
  }

  async get(snapshotId: string): Promise<SnapshotModel> {
    const response = await this.client.request<SnapshotModel>({
      method: "GET",
      path: `/snapshot/${snapshotId}`,
    });

    return this.client.validateResponse(response, SnapshotSchema);
  }

  async delete(snapshotId: string): Promise<void> {
    await this.client.request<void>({
      method: "DELETE",
      path: `/snapshot/${snapshotId}`,
    });
  }

  async fromInstance(
    instanceId: string,
    options?: SnapshotOptions
  ): Promise<SnapshotModel> {
    const body: SnapshotInstanceRequest = {
      metadata: options?.metadata,
    };

    const response = await this.client.request<SnapshotModel>({
      method: "POST",
      path: `/instance/${instanceId}/snapshot`,
      params: options?.digest ? { digest: options.digest } : undefined,
      body,
    });

    return this.client.validateResponse(response, SnapshotSchema);
  }

  async setMetadata(
    snapshotId: string,
    metadata: Record<string, string>
  ): Promise<SnapshotModel> {
    const response = await this.client.request<SnapshotModel>({
      method: "POST",
      path: `/snapshot/${snapshotId}/metadata`,
      body: metadata,
    });

    return this.client.validateResponse(response, SnapshotSchema);
  }

  async createToken(snapshotId: string, expiresIn = 3600): Promise<ShareToken> {
    const response = await this.client.request<CreateSnapshotTokenResponse>({
      method: "POST",
      path: `/snapshot/${snapshotId}/token`,
      params: { expires_in: expiresIn },
    });

    const validated = this.client.validateResponse(
      response,
      CreateSnapshotTokenResponseSchema
    );

    return {
      token: validated.token,
      expiresIn: validated.expires_in,
    };
  }

  async pull(
    token: string,
    metadata?: Record<string, string>
  ): Promise<SnapshotModel> {
    const response = await this.client.request<SnapshotModel>({
      method: "POST",
      path: "/snapshot/pull",
      params: { token },
      body: metadata,
    });

    return this.client.validateResponse(response, SnapshotSchema);
  }
}
