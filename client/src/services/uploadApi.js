import { api } from "./api.js";

export const UploadApiClient = {
  getCloudinaryConfig() {
    return api.get("/api/upload/cloudinary-config");
  },

  uploadImage({ image, folder }) {
    return api.post("/api/upload/image", { image, folder });
  },
};
