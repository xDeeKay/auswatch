import { describe, it, expect } from "vitest";
import { buildCameraCreateData } from "./build-camera-create-data";
import { CameraType, CaptureType } from "@/generated/prisma/enums";
import type { ValidatedSubmission } from "@/lib/validation/submission";

const baseInput: ValidatedSubmission = {
  lat: -31.9505,
  lng: 115.8605,
  type: CameraType.alpr,
  operator: "WA Police",
  captures: CaptureType.plates,
  notes: "Test note",
};

describe("buildCameraCreateData", () => {
  it("stamps the server-issued reporter token and validated fields", () => {
    const data = buildCameraCreateData(baseInput, "server-token-123");
    expect(data).toMatchObject({
      lat: -31.9505,
      lng: 115.8605,
      type: CameraType.alpr,
      operator: "WA Police",
      captures: CaptureType.plates,
      notes: "Test note",
      reporterId: "server-token-123",
    });
  });

  it("never includes status or moderationState, even if adversarially present on the input object", () => {
    // Simulates a malformed/malicious input bypassing the type system (e.g. via `as`),
    // asserting the function ignores anything outside its known field set.
    const adversarial = {
      ...baseInput,
      status: "active",
      moderationState: "verified",
      reporterId: "attacker-supplied-id",
    } as unknown as ValidatedSubmission;

    const data = buildCameraCreateData(adversarial, "server-token-456");

    expect(data).not.toHaveProperty("status");
    expect(data).not.toHaveProperty("moderationState");
    expect(data.reporterId).toBe("server-token-456");
  });
});
