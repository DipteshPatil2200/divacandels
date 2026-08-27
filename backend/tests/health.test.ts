import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../src/app.js";

describe("health endpoint", () => {
  it("reports the API as healthy without leaking configuration", async () => {
    const response = await request(app).get("/health");
    expect(response.status).toBe(200);
    expect(response.body.status).toBe("ok");
    expect(response.body).not.toHaveProperty("databaseUrl");
  });
});
