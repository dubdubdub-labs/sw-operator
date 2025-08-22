import type { ImageModel, ImageModelCollection } from "../types/models.js";
import { ImageSchema } from "../types/schemas.js";
import { BaseService } from "./base.service.js";

export class ImageService extends BaseService {
  async list(): Promise<ImageModel[]> {
    const response = await this.client.request<ImageModelCollection>({
      method: "GET",
      path: "/image",
    });

    return response.data.map((image) =>
      this.client.validateResponse(image, ImageSchema)
    );
  }

  async get(imageId: string): Promise<ImageModel | undefined> {
    const images = await this.list();
    return images.find((img) => img.id === imageId);
  }
}
