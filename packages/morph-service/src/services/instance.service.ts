import type {
  BranchInstanceResponse,
  ExecResponse,
  InstanceModel,
  InstanceModelCollection,
} from "../types/models.js";
import type {
  BootInstanceRequest,
  BranchInstanceRequest,
  ExposeHttpServiceRequest,
  StartInstanceRequest,
  UpdateTTLRequest,
  UpdateWakeRequest,
} from "../types/requests.js";
import {
  BranchInstanceResponseSchema,
  ExecCommandSchema,
  ExecResponseSchema,
  ExposeHttpServiceSchema,
  InstanceSchema,
  UpdateTTLSchema,
  UpdateWakeSchema,
} from "../types/schemas.js";
import { BaseService } from "./base.service.js";

export type InstanceFilters = {
  metadata?: Record<string, string>;
  [key: string]: unknown;
};

export interface ForkResult {
  snapshot: InstanceModel["refs"]["snapshot_id"];
  instances: InstanceModel[];
}

export interface ExecStreamEvent {
  type: "stdout" | "stderr" | "exit_code";
  content: string | number;
}

export class InstanceService extends BaseService {
  async list(filters?: InstanceFilters): Promise<InstanceModel[]> {
    const response = await this.client.request<InstanceModelCollection>({
      method: "GET",
      path: "/instance",
      params: filters,
    });

    return response.data.map((instance) =>
      this.client.validateResponse(instance, InstanceSchema)
    );
  }

  async get(instanceId: string): Promise<InstanceModel> {
    const response = await this.client.request<InstanceModel>({
      method: "GET",
      path: `/instance/${instanceId}`,
    });

    return this.client.validateResponse(response, InstanceSchema);
  }

  async boot(
    snapshotId: string,
    options?: BootInstanceRequest
  ): Promise<InstanceModel> {
    const response = await this.client.request<InstanceModel>({
      method: "POST",
      path: `/snapshot/${snapshotId}/boot`,
      body: options,
    });

    return this.client.validateResponse(response, InstanceSchema);
  }

  async start(
    snapshotId: string,
    options?: StartInstanceRequest
  ): Promise<InstanceModel> {
    const response = await this.client.request<InstanceModel>({
      method: "POST",
      path: "/instance",
      params: { snapshot_id: snapshotId },
      body: options,
    });

    return this.client.validateResponse(response, InstanceSchema);
  }

  async stop(instanceId: string): Promise<void> {
    await this.client.request<void>({
      method: "DELETE",
      path: `/instance/${instanceId}`,
    });
  }

  async pause(
    instanceId: string,
    createSnapshot = true
  ): Promise<InstanceModel> {
    const response = await this.client.request<InstanceModel>({
      method: "POST",
      path: `/instance/${instanceId}/pause`,
      params: { snapshot: createSnapshot },
    });

    return this.client.validateResponse(response, InstanceSchema);
  }

  async resume(instanceId: string): Promise<InstanceModel> {
    const response = await this.client.request<InstanceModel>({
      method: "POST",
      path: `/instance/${instanceId}/resume`,
    });

    return this.client.validateResponse(response, InstanceSchema);
  }

  async reboot(instanceId: string): Promise<InstanceModel> {
    const response = await this.client.request<InstanceModel>({
      method: "POST",
      path: `/instance/${instanceId}/reboot`,
    });

    return this.client.validateResponse(response, InstanceSchema);
  }

  async fork(
    instanceId: string,
    count = 1,
    options?: BranchInstanceRequest
  ): Promise<BranchInstanceResponse> {
    const response = await this.client.request<BranchInstanceResponse>({
      method: "POST",
      path: `/instance/${instanceId}/branch`,
      params: { count },
      body: options,
    });

    return this.client.validateResponse(response, BranchInstanceResponseSchema);
  }

  async exec(instanceId: string, command: string[]): Promise<ExecResponse> {
    const validatedCommand = ExecCommandSchema.parse({ command });

    const response = await this.client.request<ExecResponse>({
      method: "POST",
      path: `/instance/${instanceId}/exec`,
      body: validatedCommand,
    });

    return this.client.validateResponse(response, ExecResponseSchema);
  }

  // execStream removed - use exec instead for command execution

  async exposeHttp(
    instanceId: string,
    service: ExposeHttpServiceRequest
  ): Promise<InstanceModel> {
    const validatedService = ExposeHttpServiceSchema.parse(service);

    const response = await this.client.request<InstanceModel>({
      method: "POST",
      path: `/instance/${instanceId}/http`,
      body: validatedService,
    });

    return this.client.validateResponse(response, InstanceSchema);
  }

  async hideHttp(
    instanceId: string,
    serviceName: string
  ): Promise<InstanceModel> {
    const response = await this.client.request<InstanceModel>({
      method: "DELETE",
      path: `/instance/${instanceId}/http/${serviceName}`,
    });

    return this.client.validateResponse(response, InstanceSchema);
  }

  async getServiceUrl(
    instanceId: string,
    portOrName: string | number
  ): Promise<string> {
    const instance = await this.get(instanceId);

    const service = instance.networking.http_services?.find((s) =>
      typeof portOrName === "string"
        ? s.name === portOrName
        : s.port === portOrName
    );

    if (!service) {
      throw new Error(
        `Service ${portOrName} not found on instance ${instanceId}`
      );
    }

    return service.url;
  }

  async setMetadata(
    instanceId: string,
    metadata: Record<string, string>
  ): Promise<InstanceModel> {
    const response = await this.client.request<InstanceModel>({
      method: "POST",
      path: `/instance/${instanceId}/metadata`,
      body: metadata,
    });

    return this.client.validateResponse(response, InstanceSchema);
  }

  async updateTTL(
    instanceId: string,
    ttl: UpdateTTLRequest
  ): Promise<InstanceModel> {
    const validatedTTL = UpdateTTLSchema.parse(ttl);

    const response = await this.client.request<InstanceModel>({
      method: "POST",
      path: `/instance/${instanceId}/ttl`,
      body: validatedTTL,
    });

    return this.client.validateResponse(response, InstanceSchema);
  }

  async updateWakeOn(
    instanceId: string,
    wake: UpdateWakeRequest
  ): Promise<InstanceModel> {
    const validatedWake = UpdateWakeSchema.parse(wake);

    const response = await this.client.request<InstanceModel>({
      method: "POST",
      path: `/instance/${instanceId}/wake-on`,
      body: validatedWake,
    });

    return this.client.validateResponse(response, InstanceSchema);
  }

  // SSH operations removed - not supported in current implementation
}
