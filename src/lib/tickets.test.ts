import { describe, it, expect, vi } from "vitest";
import { AuState, CameraType } from "@/generated/prisma/enums";
import type { SubmissionTicket, CorrectionTicket, Ticket } from "./tickets";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/db", () => ({ prisma: {} }));

const { mergeTickets } = await import("./tickets");

function submission(id: string, createdAt: string): SubmissionTicket {
  return {
    kind: "submission",
    id,
    cameraId: id,
    createdAt: new Date(createdAt),
    state: AuState.wa,
    cameraType: CameraType.speed,
    camera: { id } as SubmissionTicket["camera"],
  };
}

function correction(id: string, createdAt: string): CorrectionTicket {
  return {
    kind: "correction",
    id,
    cameraId: `camera-for-${id}`,
    createdAt: new Date(createdAt),
    state: AuState.nsw,
    cameraType: CameraType.alpr,
    camera: { id: `camera-for-${id}` } as CorrectionTicket["camera"],
    correction: { id } as CorrectionTicket["correction"],
  };
}

describe("mergeTickets", () => {
  it("interleaves submission and correction tickets by createdAt ascending", () => {
    const tickets: Ticket[] = [
      submission("s2", "2026-09-05T00:00:00Z"),
      correction("c1", "2026-09-01T00:00:00Z"),
      submission("s1", "2026-09-03T00:00:00Z"),
      correction("c2", "2026-09-07T00:00:00Z"),
    ];

    const merged = mergeTickets(tickets);

    expect(merged.map((t) => t.id)).toEqual(["c1", "s1", "s2", "c2"]);
  });

  it("does not mutate the input array", () => {
    const tickets: Ticket[] = [submission("s2", "2026-09-05T00:00:00Z"), submission("s1", "2026-09-01T00:00:00Z")];
    const original = [...tickets];

    mergeTickets(tickets);

    expect(tickets).toEqual(original);
  });

  it("breaks ties on identical createdAt by id, for a stable, deterministic order", () => {
    const sameInstant = "2026-09-05T00:00:00Z";
    const tickets: Ticket[] = [submission("s2", sameInstant), correction("c1", sameInstant), submission("s1", sameInstant)];

    const merged = mergeTickets(tickets);

    expect(merged.map((t) => t.id)).toEqual(["c1", "s1", "s2"]);
  });

  it("returns an empty array for an empty input", () => {
    expect(mergeTickets([])).toEqual([]);
  });
});
