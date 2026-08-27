import { describe, expect, it } from "vitest";
import { resolveImageUrl } from "./images";

describe("resolveImageUrl", () => {
  const api = "http://localhost:8081/api/v1";

  it("resolves a stored relative upload path against the API server", () => {
    expect(resolveImageUrl("/uploads/products/photo.png", api)).toBe("http://localhost:8081/uploads/products/photo.png");
  });

  it("repairs a legacy upload URL after the backend port changes", () => {
    expect(resolveImageUrl("http://localhost:8080/uploads/products/photo.png", api)).toBe("http://localhost:8081/uploads/products/photo.png");
  });

  it("does not rewrite Cloudinary URLs", () => {
    const cloudinary = "https://res.cloudinary.com/demo/image/upload/photo.jpg";
    expect(resolveImageUrl(cloudinary, api)).toBe(cloudinary);
  });
});
