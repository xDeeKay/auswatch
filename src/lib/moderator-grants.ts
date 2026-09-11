import { AuState, CameraType } from "@/generated/prisma/enums";
import type { ModeratorGrantModel } from "@/generated/prisma/models";
import { STATE_LABEL } from "@/lib/au-state-labels";
import { TYPE_LABEL } from "@/lib/camera-labels";

export type GrantCell = { state: AuState; cameraType: CameraType; canView: boolean; canAct: boolean };

export function grantFieldName(state: AuState, cameraType: CameraType, axis: "view" | "act"): string {
  return `grant__${state}__${cameraType}__${axis}`;
}

/**
 * Reads the full grant matrix out of a submission. A checked "act" box implies
 * "view" regardless of what was actually submitted for that cell, so this
 * invariant can't be bypassed by a crafted request even though the client
 * also enforces it for a smoother UI.
 */
export function parseGrantGrid(formData: FormData): GrantCell[] {
  const grants: GrantCell[] = [];
  for (const state of Object.values(AuState)) {
    for (const cameraType of Object.values(CameraType)) {
      const canAct = formData.get(grantFieldName(state, cameraType, "act")) === "on";
      const canView = canAct || formData.get(grantFieldName(state, cameraType, "view")) === "on";
      if (canView || canAct) {
        grants.push({ state, cameraType, canView, canAct });
      }
    }
  }
  return grants;
}

export type GrantDiff = {
  toCreate: GrantCell[];
  toUpdate: Array<{ id: string; canView: boolean; canAct: boolean }>;
  toDeleteIds: string[];
};

function grantKey(state: AuState, cameraType: CameraType): string {
  return `${state}:${cameraType}`;
}

/** Pure diff between the grant rows a profile has today and the grid an admin just submitted. */
export function diffGrants(existing: ModeratorGrantModel[], desired: GrantCell[]): GrantDiff {
  const desiredByKey = new Map(desired.map((g) => [grantKey(g.state, g.cameraType), g]));
  const existingByKey = new Map(existing.map((g) => [grantKey(g.state, g.cameraType), g]));

  const toCreate: GrantCell[] = [];
  const toUpdate: Array<{ id: string; canView: boolean; canAct: boolean }> = [];
  const toDeleteIds: string[] = [];

  for (const [key, desiredGrant] of desiredByKey) {
    const existingGrant = existingByKey.get(key);
    if (!existingGrant) {
      toCreate.push(desiredGrant);
    } else if (existingGrant.canView !== desiredGrant.canView || existingGrant.canAct !== desiredGrant.canAct) {
      toUpdate.push({ id: existingGrant.id, canView: desiredGrant.canView, canAct: desiredGrant.canAct });
    }
  }

  for (const [key, existingGrant] of existingByKey) {
    if (!desiredByKey.has(key)) toDeleteIds.push(existingGrant.id);
  }

  return { toCreate, toUpdate, toDeleteIds };
}

export function summarizeGrants(grants: ModeratorGrantModel[]): string {
  if (grants.length === 0) return "No access granted yet";
  const sorted = [...grants].sort((a, b) => {
    if (a.state !== b.state) return a.state.localeCompare(b.state);
    return a.cameraType.localeCompare(b.cameraType);
  });
  return sorted
    .map((g) => `${STATE_LABEL[g.state]}: ${TYPE_LABEL[g.cameraType]} (${g.canAct ? "view+act" : "view"})`)
    .join("; ");
}
